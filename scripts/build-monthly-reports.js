require("dotenv").config({ path: "./app/.env" });

const mysql = require("mysql2/promise");
const crypto = require("crypto");

const { sendMonthlyReportEmail } = require("./send-email");

function mustEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function firstDayOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date, months) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)
  );
}

function iso(date) {
  return date.toISOString().slice(0, 10);
}

/*** Rapport maken van vorige maand*/
function defaultTargetMonth() {
  const now = new Date();
  const thisMonth = firstDayOfMonth(now);
  return addMonths(thisMonth, -1);
}

/*** Trend bepalen gebaseerd op de % verandering*/
function trendFromDelta(deltaPct) {
  if (deltaPct === null || deltaPct === undefined) return "flat";
  if (deltaPct > 2) return "up";
  if (deltaPct < -2) return "down";
  return "flat";
}

/*** % verschil*/
function deltaPct(current, previous) {
  if (previous === null || previous === undefined) return null;
  if (previous === 0) return current === 0 ? 0 : null;

  return ((current - previous) / previous) * 100;
}

/*** Magic link ttl*/
function ttlDays() {
  const raw = process.env.MAGIC_LINK_TTL_DAYS;
  const n = raw ? Number(raw) : 35;
  return Number.isFinite(n) && n > 0 ? n : 35;
}

/*** Generate token*/
function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

/*** Token hashen voor db*/
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createDbConnection() {
  return mysql.createConnection({
    uri: mustEnv("DATABASE_URL"),
  });
}

async function aggregateJsonTopList(db, customerId, columnName, limit, startDate, endDate) {
  const [rows] = await db.execute(
    `
      SELECT ${columnName}
      FROM ga4_daily_breakdowns
      WHERE customer_id = ?
        AND metric_date >= ?
        AND metric_date < ?
    `,
    [customerId, iso(startDate), iso(endDate)]
  );

  const totals = new Map();

  for (const row of rows) {
    let items = row[columnName];

    // Strings en json opvangen
    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const key = item?.key ?? "(not set)";
      const value = Number(item?.value ?? 0);

      totals.set(key, (totals.get(key) || 0) + value);
    }
  }

  return [...totals.entries()]
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

async function aggregateGscTopQueries(db, customerId, limit, startDate, endDate) {
  const [rows] = await db.execute(
    `
      SELECT top_queries
      FROM gsc_daily_queries
      WHERE customer_id = ?
        AND metric_date >= ?
        AND metric_date < ?
    `,
    [customerId, iso(startDate), iso(endDate)]
  );

  const totals = new Map();

  for (const row of rows) {
    let items = row.top_queries;

    if (typeof items === "string") {
      try {
        items = JSON.parse(items);
      } catch {
        items = [];
      }
    }

    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const query = item?.query ?? "(not set)";
      const clicks = Number(item?.clicks ?? 0);
      const impressions = Number(item?.impressions ?? 0);

      if (!totals.has(query)) {
        totals.set(query, {
          query,
          clicks: 0,
          impressions: 0,
        });
      }

      const current = totals.get(query);
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
      prevMonthStart
    )} -> ${iso(prevMonthEnd)})`
  );

  const db = await createDbConnection();

  // Start
  const [jobRunResult] = await db.execute(
    `
      INSERT INTO job_runs (job_name, status, target_date)
      VALUES (?, 'running', ?)
    `,
    ["monthly_build", iso(monthStart)]
  );

  const jobRunId = jobRunResult.insertId;

  // Actieve klanten ophalen
  const [customers] = await db.execute(
    `
      SELECT id, name, contact_emails, report_enabled
      FROM customers
      WHERE is_active = TRUE
      ORDER BY name ASC
    `
  );

  let ok = 0;
  let fail = 0;
  let errorSummary = "";

  const baseUrl = mustEnv("MAGIC_LINK_BASE_URL");
  const ttl = ttlDays();

  // Indien geen klanten, stop
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
      [jobRunId]
    );

    await db.end();

    console.log("Geen actieve klanten gevonden. Er werd niets opgebouwd.");
    return;
  }

  for (const customer of customers) {
    const label = `${customer.name} (${customer.id})`;

    try {
      // GA4
      const [ga4AggRows] = await db.execute(
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
        [customer.id, iso(monthStart), iso(monthEnd)]
      );

      const g = ga4AggRows[0];

      const topPages = await aggregateJsonTopList(
        db,
        customer.id,
        "top_pages",
        5,
        monthStart,
        monthEnd
      );

      const topCountries = await aggregateJsonTopList(
        db,
        customer.id,
        "top_countries",
        5,
        monthStart,
        monthEnd
      );

      const topSources = await aggregateJsonTopList(
        db,
        customer.id,
        "top_sources",
        5,
        monthStart,
        monthEnd
      );

      const topEvents = await aggregateJsonTopList(
        db,
        customer.id,
        "top_events",
        5,
        monthStart,
        monthEnd
      );

      const deviceSplit = await aggregateJsonTopList(
        db,
        customer.id,
        "device_split",
        3,
        monthStart,
        monthEnd
      );

      // GSC
      const [gscAggRows] = await db.execute(
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
        [customer.id, iso(monthStart), iso(monthEnd)]
      );

      const s = gscAggRows[0];

      const topQueries = await aggregateGscTopQueries(
        db,
        customer.id,
        5,
        monthStart,
        monthEnd
      );

      // Summary maken
      const summary = {
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
            g.engagement_rate_avg !== null ? Number(g.engagement_rate_avg) : null,
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

      // Vorige maand voor vergelijking
      const [ga4PrevRows] = await db.execute(
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
        [customer.id, iso(prevMonthStart), iso(prevMonthEnd)]
      );

      const gp = ga4PrevRows[0];

      const [gscPrevRows] = await db.execute(
        `
          SELECT
            COALESCE(SUM(clicks), 0) AS clicks_sum,
            COALESCE(SUM(impressions), 0) AS impressions_sum
          FROM gsc_daily_metrics
          WHERE customer_id = ?
            AND metric_date >= ?
            AND metric_date < ?
        `,
        [customer.id, iso(prevMonthStart), iso(prevMonthEnd)]
      );

      const sp = gscPrevRows[0];

      function compEntry(key, current, previous) {
        const delta = deltaPct(current, previous);

        return {
          key,
          current,
          previous,
          delta_pct: delta,
          trend: trendFromDelta(delta),
        };
      }

      const comparison = {
        month: iso(monthStart),
        vs_month: iso(prevMonthStart),
        kpis: {
          new_users: compEntry(
            "new_users",
            summary.kpis.new_users,
            Number(gp.new_users_sum)
          ),
          active_users: compEntry(
            "active_users",
            summary.kpis.active_users,
            Number(gp.active_users_sum)
          ),
          sessions: compEntry(
            "sessions",
            summary.kpis.sessions,
            Number(gp.sessions_sum)
          ),
          pageviews: compEntry(
            "pageviews",
            summary.kpis.pageviews,
            Number(gp.pageviews_sum)
          ),
          engagement_rate_avg: compEntry(
            "engagement_rate_avg",
            summary.kpis.engagement_rate_avg,
            gp.engagement_rate_avg !== null ? Number(gp.engagement_rate_avg) : null
          ),
          pages_per_session_avg: compEntry(
            "pages_per_session_avg",
            summary.kpis.pages_per_session_avg,
            gp.pages_per_session_avg !== null ? Number(gp.pages_per_session_avg) : null
          ),
          conversions: compEntry(
            "conversions",
            summary.kpis.conversions,
            Number(gp.conversions_sum)
          ),
          gsc_clicks: compEntry(
            "gsc_clicks",
            summary.gsc.clicks,
            Number(sp.clicks_sum)
          ),
          gsc_impressions: compEntry(
            "gsc_impressions",
            summary.gsc.impressions,
            Number(sp.impressions_sum)
          ),
        },
      };

      //Rapport opslaan/updaten
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
        ]
      );

      console.log(`📦 Rapport opgeslagen: ${label} maand=${iso(monthStart)}`);

      // Magic link aanmaken
      const token = makeToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000);

      await db.execute(
        `
          INSERT INTO magic_link_tokens (
            customer_id,
            token_hash,
            created_for_month,
            expires_at,
            created_at
          )
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            token_hash = VALUES(token_hash),
            expires_at = VALUES(expires_at),
            created_at = CURRENT_TIMESTAMP,
            used_at = NULL,
            revoked_at = NULL
        `,
        [customer.id, tokenHash, iso(monthStart), expiresAt]
      );

      const reportUrl = `${baseUrl}/${token}?month=${iso(monthStart)}`;

      console.log(`🔗 Magic link aangemaakt: ${label} -> ${reportUrl}`);

      // Send mails
      // contact_emails zit als JSON in de database.
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

      // Alleen mails sturen naar klanten die dat willen
      if (customer.report_enabled && contactEmails.length > 0) {
        for (const email of contactEmails) {
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
          [customer.id, iso(monthStart)]
        );
      } else {
        console.log(
          `ℹ️ Geen e-mail verzonden voor ${label} (report_enabled uit of geen contact_emails)`
        );
      }

      ok++;
    } catch (error) {
      fail++;
      const message = `❌ Monthly build mislukt voor ${label}: ${error.message}`;
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
    [status, customers.length, ok, fail, errorSummary.slice(0, 4000), jobRunId]
  );

  await db.end();

  console.log(`Monthly build klaar. status=${status} ok=${ok} fail=${fail}`);
}

main().catch((error) => {
  console.error("Fatale fout in monthly build script:");
  console.error(error);
  process.exit(1);
});
