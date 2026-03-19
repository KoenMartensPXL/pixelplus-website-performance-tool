import * as dotenv from "dotenv";
dotenv.config({ path: "./app/.env" });

import mysql from "mysql2/promise";
import crypto from "crypto";
import { sendMonthlyReportEmail } from "./send-email";

function mustEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function firstDayOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1),
  );
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Rapport maken van vorige maand */
function defaultTargetMonth(): Date {
  const now = new Date();
  const thisMonth = firstDayOfMonth(now);
  return addMonths(thisMonth, -1);
}

/** Trend bepalen gebaseerd op de % verandering */
function trendFromDelta(
  deltaPct: number | null | undefined,
): "up" | "down" | "flat" {
  if (deltaPct === null || deltaPct === undefined) return "flat";
  if (deltaPct > 2) return "up";
  if (deltaPct < -2) return "down";
  return "flat";
}

/** % verschil */
function deltaPct(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | null {
  if (current === null || current === undefined) return null;
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return current === 0 ? 0 : null;

  return ((current - previous) / previous) * 100;
}

/** Magic link ttl */
function ttlDays(): number {
  const raw = process.env.MAGIC_LINK_TTL_DAYS;
  const n = raw ? Number(raw) : 35;
  return Number.isFinite(n) && n > 0 ? n : 35;
}

/** Generate token */
function makeToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Token hashen voor db */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createDbConnection() {
  return mysql.createConnection({
    uri: mustEnv("DATABASE_URL"),
  });
}

type TopListItem = {
  key: string;
  value: number;
};

type TopQueryItem = {
  query: string;
  clicks: number;
  impressions: number;
};

type Summary = {
  month: string;
  range: {
    start: string;
    end_exclusive: string;
  };
  kpis: {
    new_users: number;
    active_users: number;
    sessions: number;
    pageviews: number;
    engagement_rate_avg: number | null;
    bounce_rate_avg: number | null;
    avg_engagement_time_seconds_avg: number | null;
    pages_per_session_avg: number | null;
    conversions: number;
    total_revenue: number;
  };
  top_pages: TopListItem[];
  top_countries: TopListItem[];
  top_sources: TopListItem[];
  top_events: TopListItem[];
  device_split: TopListItem[];
  gsc: {
    clicks: number;
    impressions: number;
    ctr_avg: number | null;
    position_avg: number | null;
  };
  top_queries: TopQueryItem[];
};

type ComparisonEntry = {
  key: string;
  current: number | null;
  previous: number | null;
  delta_pct: number | null;
  trend: "up" | "down" | "flat";
};

type Comparison = {
  month: string;
  vs_month: string;
  kpis: {
    new_users: ComparisonEntry;
    active_users: ComparisonEntry;
    sessions: ComparisonEntry;
    pageviews: ComparisonEntry;
    engagement_rate_avg: ComparisonEntry;
    pages_per_session_avg: ComparisonEntry;
    conversions: ComparisonEntry;
    gsc_clicks: ComparisonEntry;
    gsc_impressions: ComparisonEntry;
  };
};

type CustomerRow = {
  id: number;
  name: string;
  slug: string;
  contact_emails: string[] | string | null;
  report_enabled: number | boolean;
};

async function aggregateJsonTopList(
  db: mysql.Connection,
  customerId: number,
  columnName: string,
  limit: number,
  startDate: Date,
  endDate: Date,
): Promise<TopListItem[]> {
  const [rows] = await db.execute(
    `
      SELECT ${columnName}
      FROM ga4_daily_breakdowns
      WHERE customer_id = ?
        AND metric_date >= ?
        AND metric_date < ?
    `,
    [customerId, iso(startDate), iso(endDate)],
  );

  const totals = new Map<string, number>();

  for (const row of rows as Array<Record<string, unknown>>) {
    let items = row[columnName];

    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    if (!Array.isArray(items)) continue;

    for (const item of items as Array<{ key?: unknown; value?: unknown }>) {
      const key = typeof item?.key === "string" ? item.key : "(not set)";
      const value = Number(item?.value ?? 0);
      totals.set(key, (totals.get(key) || 0) + value);
    }
  }

  return [...totals.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

async function aggregateGscTopQueries(
  db: mysql.Connection,
  customerId: number,
  limit: number,
  startDate: Date,
  endDate: Date,
): Promise<TopQueryItem[]> {
  const [rows] = await db.execute(
    `
      SELECT top_queries
      FROM gsc_daily_queries
      WHERE customer_id = ?
        AND metric_date >= ?
        AND metric_date < ?
    `,
    [customerId, iso(startDate), iso(endDate)],
  );

  const totals = new Map<string, TopQueryItem>();

  for (const row of rows as Array<Record<string, unknown>>) {
    let items = row.top_queries;

    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    if (!Array.isArray(items)) continue;

    for (const item of items as Array<{
      query?: unknown;
      clicks?: unknown;
      impressions?: unknown;
    }>) {
      const query = typeof item?.query === "string" ? item.query : "(not set)";
      const clicks = Number(item?.clicks ?? 0);
      const impressions = Number(item?.impressions ?? 0);

      if (!totals.has(query)) {
        totals.set(query, {
          query,
          clicks: 0,
          impressions: 0,
        });
      }

      const current = totals.get(query)!;
      current.clicks += clicks;
      current.impressions += impressions;
    }
  }

  return [...totals.values()]
    .sort((a, b) => {
      if (b.clicks !== a.clicks) return b.clicks - a.clicks;
      return b.impressions - a.impressions;
    })
    .slice(0, limit);
}

function compEntry(
  key: string,
  current: number | null | undefined,
  previous: number | null | undefined,
): ComparisonEntry {
  const delta = deltaPct(current, previous);

  return {
    key,
    current: current ?? null,
    previous: previous ?? null,
    delta_pct: delta,
    trend: trendFromDelta(delta),
  };
}

async function main() {
  const targetMonthStr = process.env.TARGET_MONTH;

  const targetMonth = targetMonthStr
    ? new Date(`${targetMonthStr}T00:00:00Z`)
    : defaultTargetMonth();

  const monthStart = firstDayOfMonth(targetMonth);
  const monthEnd = addMonths(monthStart, 1);
  const prevMonthStart = addMonths(monthStart, -1);
  const prevMonthEnd = monthStart;

  console.log(
    `Monthly build: maand=${iso(monthStart)} -> ${iso(monthEnd)} (vorige maand ${iso(
      prevMonthStart,
    )} -> ${iso(prevMonthEnd)})`,
  );

  const db = await createDbConnection();

  const [jobRunResult] = await db.execute(
    `
      INSERT INTO job_runs (job_name, status, target_date)
      VALUES (?, 'running', ?)
    `,
    ["monthly_build", iso(monthStart)],
  );

  const jobRunId = (jobRunResult as mysql.ResultSetHeader).insertId;

  const [customersRaw] = await db.execute(
    `
      SELECT id, name, slug, contact_emails, report_enabled
      FROM customers
      WHERE is_active = TRUE
      ORDER BY name ASC
    `,
  );

  const customers = customersRaw as CustomerRow[];

  let ok = 0;
  let fail = 0;
  let errorSummary = "";

  const baseUrl = mustEnv("MAGIC_LINK_BASE_URL");
  const ttl = ttlDays();

  if (customers.length === 0) {
    await db.execute(
      `
        UPDATE job_runs
        SET finished_at = CURRENT_TIMESTAMP,
            status = 'success',
            customers_total = 0,
            customers_success = 0,
            customers_failed = 0,
            error_summary = 'No active customers found. Nothing to build.'
        WHERE id = ?
      `,
      [jobRunId],
    );

    await db.end();

    console.log("Geen actieve klanten gevonden. Er werd niets opgebouwd.");
    return;
  }

  for (const customer of customers) {
    const label = `${customer.name} (${customer.id})`;

    try {
      const [ga4AggRowsRaw] = await db.execute(
        `
          SELECT
            COALESCE(SUM(new_users), 0) AS new_users_sum,
            COALESCE(SUM(active_users), 0) AS active_users_sum,
            COALESCE(SUM(sessions), 0) AS sessions_sum,
            COALESCE(SUM(pageviews), 0) AS pageviews_sum,
            AVG(engagement_rate) AS engagement_rate_avg,
            AVG(bounce_rate) AS bounce_rate_avg,
            AVG(avg_engagement_time_seconds) AS avg_engagement_time_seconds_avg,
            AVG(pages_per_session) AS pages_per_session_avg,
            COALESCE(SUM(conversions), 0) AS conversions_sum,
            COALESCE(SUM(total_revenue), 0) AS total_revenue_sum
          FROM ga4_daily_metrics
          WHERE customer_id = ?
            AND metric_date >= ?
            AND metric_date < ?
        `,
        [customer.id, iso(monthStart), iso(monthEnd)],
      );

      const g = (ga4AggRowsRaw as Array<Record<string, unknown>>)[0];

      const topPages = await aggregateJsonTopList(
        db,
        customer.id,
        "top_pages",
        5,
        monthStart,
        monthEnd,
      );

      const topCountries = await aggregateJsonTopList(
        db,
        customer.id,
        "top_countries",
        5,
        monthStart,
        monthEnd,
      );

      const topSources = await aggregateJsonTopList(
        db,
        customer.id,
        "top_sources",
        5,
        monthStart,
        monthEnd,
      );

      const topEvents = await aggregateJsonTopList(
        db,
        customer.id,
        "top_events",
        5,
        monthStart,
        monthEnd,
      );

      const deviceSplit = await aggregateJsonTopList(
        db,
        customer.id,
        "device_split",
        3,
        monthStart,
        monthEnd,
      );

      const [gscAggRowsRaw] = await db.execute(
        `
          SELECT
            COALESCE(SUM(clicks), 0) AS clicks_sum,
            COALESCE(SUM(impressions), 0) AS impressions_sum,
            AVG(ctr) AS ctr_avg,
            AVG(avg_position) AS position_avg
          FROM gsc_daily_metrics
          WHERE customer_id = ?
            AND metric_date >= ?
            AND metric_date < ?
        `,
        [customer.id, iso(monthStart), iso(monthEnd)],
      );

      const s = (gscAggRowsRaw as Array<Record<string, unknown>>)[0];

      const topQueries = await aggregateGscTopQueries(
        db,
        customer.id,
        5,
        monthStart,
        monthEnd,
      );

      const summary: Summary = {
        month: iso(monthStart),
        range: {
          start: iso(monthStart),
          end_exclusive: iso(monthEnd),
        },
        kpis: {
          new_users: Number(g.new_users_sum),
          active_users: Number(g.active_users_sum),
          sessions: Number(g.sessions_sum),
          pageviews: Number(g.pageviews_sum),
          engagement_rate_avg:
            g.engagement_rate_avg !== null
              ? Number(g.engagement_rate_avg)
              : null,
          bounce_rate_avg:
            g.bounce_rate_avg !== null ? Number(g.bounce_rate_avg) : null,
          avg_engagement_time_seconds_avg:
            g.avg_engagement_time_seconds_avg !== null
              ? Number(g.avg_engagement_time_seconds_avg)
              : null,
          pages_per_session_avg:
            g.pages_per_session_avg !== null
              ? Number(g.pages_per_session_avg)
              : null,
          conversions: Number(g.conversions_sum),
          total_revenue:
            g.total_revenue_sum !== null ? Number(g.total_revenue_sum) : 0,
        },
        top_pages: topPages,
        top_countries: topCountries,
        top_sources: topSources,
        top_events: topEvents,
        device_split: deviceSplit,
        gsc: {
          clicks: Number(s.clicks_sum),
          impressions: Number(s.impressions_sum),
          ctr_avg: s.ctr_avg !== null ? Number(s.ctr_avg) : null,
          position_avg: s.position_avg !== null ? Number(s.position_avg) : null,
        },
        top_queries: topQueries,
      };

      const [ga4PrevRowsRaw] = await db.execute(
        `
          SELECT
            COALESCE(SUM(new_users), 0) AS new_users_sum,
            COALESCE(SUM(active_users), 0) AS active_users_sum,
            COALESCE(SUM(sessions), 0) AS sessions_sum,
            COALESCE(SUM(pageviews), 0) AS pageviews_sum,
            AVG(engagement_rate) AS engagement_rate_avg,
            AVG(pages_per_session) AS pages_per_session_avg,
            COALESCE(SUM(conversions), 0) AS conversions_sum
          FROM ga4_daily_metrics
          WHERE customer_id = ?
            AND metric_date >= ?
            AND metric_date < ?
        `,
        [customer.id, iso(prevMonthStart), iso(prevMonthEnd)],
      );

      const gp = (ga4PrevRowsRaw as Array<Record<string, unknown>>)[0];

      const [gscPrevRowsRaw] = await db.execute(
        `
          SELECT
            COALESCE(SUM(clicks), 0) AS clicks_sum,
            COALESCE(SUM(impressions), 0) AS impressions_sum
          FROM gsc_daily_metrics
          WHERE customer_id = ?
            AND metric_date >= ?
            AND metric_date < ?
        `,
        [customer.id, iso(prevMonthStart), iso(prevMonthEnd)],
      );

      const sp = (gscPrevRowsRaw as Array<Record<string, unknown>>)[0];

      const comparison: Comparison = {
        month: iso(monthStart),
        vs_month: iso(prevMonthStart),
        kpis: {
          new_users: compEntry(
            "new_users",
            summary.kpis.new_users,
            Number(gp.new_users_sum),
          ),
          active_users: compEntry(
            "active_users",
            summary.kpis.active_users,
            Number(gp.active_users_sum),
          ),
          sessions: compEntry(
            "sessions",
            summary.kpis.sessions,
            Number(gp.sessions_sum),
          ),
          pageviews: compEntry(
            "pageviews",
            summary.kpis.pageviews,
            Number(gp.pageviews_sum),
          ),
          engagement_rate_avg: compEntry(
            "engagement_rate_avg",
            summary.kpis.engagement_rate_avg,
            gp.engagement_rate_avg !== null
              ? Number(gp.engagement_rate_avg)
              : null,
          ),
          pages_per_session_avg: compEntry(
            "pages_per_session_avg",
            summary.kpis.pages_per_session_avg,
            gp.pages_per_session_avg !== null
              ? Number(gp.pages_per_session_avg)
              : null,
          ),
          conversions: compEntry(
            "conversions",
            summary.kpis.conversions,
            Number(gp.conversions_sum),
          ),
          gsc_clicks: compEntry(
            "gsc_clicks",
            summary.gsc.clicks,
            Number(sp.clicks_sum),
          ),
          gsc_impressions: compEntry(
            "gsc_impressions",
            summary.gsc.impressions,
            Number(sp.impressions_sum),
          ),
        },
      };

      await db.execute(
        `
          INSERT INTO monthly_reports (
            customer_id,
            report_month,
            summary,
            comparison,
            generated_at
          )
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            summary = VALUES(summary),
            comparison = VALUES(comparison),
            generated_at = CURRENT_TIMESTAMP
        `,
        [
          customer.id,
          iso(monthStart),
          JSON.stringify(summary),
          JSON.stringify(comparison),
        ],
      );

      console.log(`📦 Rapport opgeslagen: ${label} maand=${iso(monthStart)}`);

      const token = makeToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);

      await db.execute(
        `
          INSERT INTO magic_link_tokens (
            customer_id,
            token_hash,
            expires_at,
            created_at,
            used_at,
            revoked_at
          )
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, NULL, NULL)
          ON DUPLICATE KEY UPDATE
            token_hash = VALUES(token_hash),
            expires_at = VALUES(expires_at),
            created_at = CURRENT_TIMESTAMP,
            used_at = NULL,
            revoked_at = NULL
        `,
        [customer.id, tokenHash, expiresAt],
      );

      const reportUrl = `${baseUrl}/${customer.slug}/${token}`;

      console.log(`🔗 Magic link aangemaakt: ${label} -> ${reportUrl}`);

      let contactEmails = customer.contact_emails;

      if (typeof contactEmails === "string") {
        try {
          contactEmails = JSON.parse(contactEmails);
        } catch {
          contactEmails = [];
        }
      }

      if (!Array.isArray(contactEmails)) {
        contactEmails = [];
      }

      if (customer.report_enabled && contactEmails.length > 0) {
        for (const email of contactEmails as string[]) {
          await sendMonthlyReportEmail({
            to: email,
            customerName: customer.name,
            monthStr: iso(monthStart),
            reportUrl,
            summary,
            comparison,
          });

          console.log(`✉️ Rapportmail verstuurd naar ${email}: ${label}`);
        }

        await db.execute(
          `
            UPDATE monthly_reports
            SET email_sent_at = CURRENT_TIMESTAMP
            WHERE customer_id = ?
              AND report_month = ?
          `,
          [customer.id, iso(monthStart)],
        );
      } else {
        console.log(
          `ℹ️ Geen e-mail verzonden voor ${label} (report_enabled uit of geen contact_emails)`,
        );
      }

      ok++;
    } catch (error) {
      fail++;
      const message = `❌ Monthly build mislukt voor ${label}: ${
        error instanceof Error ? error.message : String(error)
      }`;
      console.error(message);
      errorSummary += `${message}\n`;
    }
  }

  const status = fail === 0 ? "success" : ok > 0 ? "partial" : "failed";

  await db.execute(
    `
      UPDATE job_runs
      SET finished_at = CURRENT_TIMESTAMP,
          status = ?,
          customers_total = ?,
          customers_success = ?,
          customers_failed = ?,
          error_summary = ?
      WHERE id = ?
    `,
    [status, customers.length, ok, fail, errorSummary.slice(0, 4000), jobRunId],
  );

  await db.end();

  console.log(`Monthly build klaar. status=${status} ok=${ok} fail=${fail}`);
}

main().catch((error) => {
  console.error("Fatale fout in monthly build script:");
  console.error(error);
  process.exit(1);
});
