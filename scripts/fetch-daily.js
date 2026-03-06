// Laad environment variables.
// We proberen eerst app/.env, omdat jouw frontend daar zit.
// Als dat bestand niet bestaat, geeft dotenv geen harde fout.
require("dotenv").config({ path: "./app/.env" });

const mysql = require("mysql2/promise");
const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const { google } = require("googleapis");

/**
 * Haal een verplichte environment variable op.
 * Als die ontbreekt, stoppen we meteen met een duidelijke foutmelding.
 */
function mustEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

/**
 * Zet een JavaScript Date om naar YYYY-MM-DD.
 * Dit formaat gebruiken we voor de database en API-calls.
 */
function toISODate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * Geef "gisteren" terug in UTC.
 * De daily fetch draait normaal voor de vorige dag.
 */
function yesterdayUTC() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date;
}

/**
 * Haal de Google service account credentials op uit env.
 *
 * Ondersteunde formaten:
 * - GA_SERVICE_ACCOUNT_JSON
 * - GA_SERVICE_ACCOUNT_JSON_B64
 *
 * Zo blijft dit compatibel met je oude testproject.
 */
function getServiceAccount() {
  if (process.env.GA_SERVICE_ACCOUNT_JSON_B64) {
    const raw = Buffer.from(
      process.env.GA_SERVICE_ACCOUNT_JSON_B64,
      "base64"
    ).toString("utf8");

    return JSON.parse(raw);
  }

  return JSON.parse(mustEnv("GA_SERVICE_ACCOUNT_JSON"));
}

/**
 * Helper om async code te wrappen met een duidelijke label.
 * Handig zodat foutmeldingen meteen tonen in welk onderdeel
 * van het proces iets fout liep.
 */
async function safe(label, fn) {
  try {
    return await fn();
  } catch (error) {
    const message = error?.message || String(error);
    const details = error?.details
      ? ` | details=${JSON.stringify(error.details)}`
      : "";

    throw new Error(`[${label}] ${message}${details}`);
  }
}

/**
 * Sommige GA4 properties ondersteunen niet altijd exact dezelfde
 * metrics of dimensions. Daarom proberen we eerst de hoofdquery,
 * en daarna optionele fallbacks.
 */
async function runReportWithFallback(label, ga, request, fallbacks = []) {
  try {
    return await safe(label, async () => ga.runReport(request));
  } catch (error) {
    const message = error.message || "";

    // Alleen fallbacks proberen als het om een ongeldige query gaat.
    if (!message.includes("INVALID_ARGUMENT") || fallbacks.length === 0) {
      throw error;
    }

    for (const fallback of fallbacks) {
      try {
        return await safe(`${label} (fallback: ${fallback.name})`, async () =>
          ga.runReport(fallback.request(request))
        );
      } catch {
        // Gewoon doorgaan naar de volgende fallback.
      }
    }

    // Als alle fallbacks mislukken, gooien we de originele fout terug.
    throw error;
  }
}

/**
 * Maak een MySQL connectie op basis van DATABASE_URL.
 */
async function createDbConnection() {
  return mysql.createConnection({
    uri: mustEnv("DATABASE_URL"),
  });
}

async function main() {
  // Gebruik TARGET_DATE als die is meegegeven.
  // Anders nemen we standaard gisteren.
  const targetDate = process.env.TARGET_DATE || toISODate(yesterdayUTC());

  // Lees de service account in voor Google API toegang.
  const serviceAccount = getServiceAccount();

  // -------------------------------------------------------
  // 1. Verbind met de database
  // -------------------------------------------------------
  const db = await createDbConnection();

  // -------------------------------------------------------
  // 2. Maak een job_runs record aan zodat we loggen
  //    wanneer deze fetch gestart is
  // -------------------------------------------------------
  const [jobRunResult] = await db.execute(
    `
      INSERT INTO job_runs (job_name, status, target_date)
      VALUES (?, 'running', ?)
    `,
    ["daily_fetch", targetDate]
  );

  const jobRunId = jobRunResult.insertId;

  // -------------------------------------------------------
  // 3. Haal alle actieve klanten op
  //    Alleen actieve klanten worden meegenomen in de fetch
  // -------------------------------------------------------
  const [customers] = await db.execute(
    `
      SELECT id, name, ga4_property_id, gsc_site_url
      FROM customers
      WHERE is_active = TRUE
      ORDER BY name ASC
    `
  );

  console.log(`Daily fetch gestart voor datum: ${targetDate}`);
  console.log(`Aantal actieve klanten gevonden: ${customers.length}`);

  // -------------------------------------------------------
  // 4. Als er nog geen klanten zijn, stoppen we netjes
  //    zonder error. Dit is handig tijdens development.
  // -------------------------------------------------------
  if (customers.length === 0) {
    await db.execute(
      `
        UPDATE job_runs
        SET finished_at = CURRENT_TIMESTAMP,
            status = 'success',
            customers_total = 0,
            customers_success = 0,
            customers_failed = 0,
            error_summary = 'No active customers found. Nothing to fetch.'
        WHERE id = ?
      `,
      [jobRunId]
    );

    await db.end();

    console.log("Geen actieve klanten gevonden. Er werd niets opgehaald.");
    return;
  }

  // -------------------------------------------------------
  // 5. Maak de Google API clients aan
  // -------------------------------------------------------
  const ga = new BetaAnalyticsDataClient({
    credentials: serviceAccount,
  });

  const jwt = new google.auth.JWT({
    email: serviceAccount.client_email,
    key: serviceAccount.private_key,
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });

  const gsc = google.searchconsole({
    version: "v1",
    auth: jwt,
  });

  let successCount = 0;
  let failureCount = 0;
  let errorSummary = "";

  // -------------------------------------------------------
  // 6. Verwerk elke actieve klant één voor één
  // -------------------------------------------------------
  for (const customer of customers) {
    const customerLabel = `${customer.name} (${customer.ga4_property_id || "no-property"})`;

    try {
      if (!customer.ga4_property_id) {
        throw new Error("Missing ga4_property_id for customer");
      }

      const property = `properties/${customer.ga4_property_id}`;

      // =====================================================
      // DEEL A: GA4 TOTALS
      // =====================================================
      // Hier halen we de belangrijkste dagelijkse GA4 metrics op.
      const totalsRequest = {
        property,
        dateRanges: [{ startDate: targetDate, endDate: targetDate }],
        metrics: [
          { name: "newUsers" },
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "engagementRate" },
          { name: "bounceRate" },
          { name: "averageEngagementTime" },
          { name: "conversions" },
          { name: "totalRevenue" },
        ],
      };

      // Sommige properties ondersteunen niet alle metrics op dezelfde manier.
      // Daarom voorzien we fallbacks.
      const [totalsResponse] = await runReportWithFallback(
        `GA4 totals voor ${customerLabel}`,
        ga,
        totalsRequest,
        [
          {
            name: "averageEngagementTime -> averageSessionDuration",
            request: (req) => ({
              ...req,
              metrics: req.metrics.map((metric) =>
                metric.name === "averageEngagementTime"
                  ? { name: "averageSessionDuration" }
                  : metric
              ),
            }),
          },
          {
            name: "averageEngagementTime -> userEngagementDuration",
            request: (req) => ({
              ...req,
              metrics: req.metrics.map((metric) =>
                metric.name === "averageEngagementTime"
                  ? { name: "userEngagementDuration" }
                  : metric
              ),
            }),
          },
          {
            name: "verwijder conversions en totalRevenue",
            request: (req) => ({
              ...req,
              metrics: req.metrics.filter(
                (metric) =>
                  metric.name !== "conversions" &&
                  metric.name !== "totalRevenue"
              ),
            }),
          },
        ]
      );

      const totalsRow = totalsResponse.rows?.[0];
      const metricValues = totalsRow?.metricValues?.map((m) => m.value) ?? [];

      // Zet alle waarden om naar getallen
      const newUsers = Number(metricValues[0] ?? 0);
      const activeUsers = Number(metricValues[1] ?? 0);
      const sessions = Number(metricValues[2] ?? 0);
      const pageviews = Number(metricValues[3] ?? 0);
      const engagementRate =
        metricValues[4] != null ? Number(metricValues[4]) : null;
      const bounceRate =
        metricValues[5] != null ? Number(metricValues[5]) : null;
      const avgEngagementTimeSeconds =
        metricValues[6] != null ? Math.round(Number(metricValues[6])) : null;
      const conversions =
        metricValues.length >= 8 && metricValues[7] != null
          ? Number(metricValues[7])
          : 0;
      const totalRevenue =
        metricValues.length >= 9 && metricValues[8] != null
          ? Number(metricValues[8])
          : 0;

      // Extra afgeleide metric
      const pagesPerSession = sessions > 0 ? pageviews / sessions : null;

      // Sla de dagelijkse GA4 totals op in MySQL
      await safe(`DB upsert ga4_daily_metrics voor ${customerLabel}`, async () =>
        db.execute(
          `
            INSERT INTO ga4_daily_metrics (
              customer_id,
              metric_date,
              new_users,
              active_users,
              sessions,
              pageviews,
              engagement_rate,
              bounce_rate,
              avg_engagement_time_seconds,
              pages_per_session,
              conversions,
              total_revenue,
              fetched_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
              new_users = VALUES(new_users),
              active_users = VALUES(active_users),
              sessions = VALUES(sessions),
              pageviews = VALUES(pageviews),
              engagement_rate = VALUES(engagement_rate),
              bounce_rate = VALUES(bounce_rate),
              avg_engagement_time_seconds = VALUES(avg_engagement_time_seconds),
              pages_per_session = VALUES(pages_per_session),
              conversions = VALUES(conversions),
              total_revenue = VALUES(total_revenue),
              fetched_at = CURRENT_TIMESTAMP
          `,
          [
            customer.id,
            targetDate,
            newUsers,
            activeUsers,
            sessions,
            pageviews,
            engagementRate,
            bounceRate,
            avgEngagementTimeSeconds,
            pagesPerSession,
            conversions,
            totalRevenue,
          ]
        )
      );

      // =====================================================
      // DEEL B: GA4 BREAKDOWNS
      // =====================================================
      // Deze helper haalt toplijsten op, zoals top pages of top countries.
      async function topList(
        label,
        dimensionName,
        metricName,
        limit = 5,
        dimensionFallbacks = []
      ) {
        const request = {
          property,
          dateRanges: [{ startDate: targetDate, endDate: targetDate }],
          dimensions: [{ name: dimensionName }],
          metrics: [{ name: metricName }],
          orderBys: [{ metric: { metricName }, desc: true }],
          limit,
        };

        const fallbackRequests = dimensionFallbacks.map((fallbackDimension) => ({
          name: `dimension ${dimensionName} -> ${fallbackDimension}`,
          request: (req) => ({
            ...req,
            dimensions: [{ name: fallbackDimension }],
          }),
        }));

        const [response] = await runReportWithFallback(
          `${label} voor ${customerLabel}`,
          ga,
          request,
          fallbackRequests
        );

        return (response.rows ?? []).map((row) => ({
          key: row.dimensionValues?.[0]?.value ?? "(not set)",
          value: Number(row.metricValues?.[0]?.value ?? 0),
        }));
      }

      const topPages = await topList(
        "GA4 top pages",
        "pagePath",
        "screenPageViews",
        5,
        ["pagePathPlusQueryString", "unifiedPagePathScreen", "pageTitle"]
      );

      const topCountries = await topList(
        "GA4 top countries",
        "country",
        "activeUsers",
        5
      );

      const topSources = await topList(
        "GA4 top sources",
        "sessionSource",
        "sessions",
        5,
        ["sessionSourceMedium", "firstUserSourceMedium", "firstUserSource"]
      );

      const topEvents = await topList(
        "GA4 top events",
        "eventName",
        "eventCount",
        5
      );

      const deviceSplit = await topList(
        "GA4 device split",
        "deviceCategory",
        "sessions",
        3
      );

      // Sla de breakdowns op als JSON
      await safe(`DB upsert ga4_daily_breakdowns voor ${customerLabel}`, async () =>
        db.execute(
          `
            INSERT INTO ga4_daily_breakdowns (
              customer_id,
              metric_date,
              top_pages,
              top_countries,
              top_sources,
              top_events,
              device_split,
              fetched_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON DUPLICATE KEY UPDATE
              top_pages = VALUES(top_pages),
              top_countries = VALUES(top_countries),
              top_sources = VALUES(top_sources),
              top_events = VALUES(top_events),
              device_split = VALUES(device_split),
              fetched_at = CURRENT_TIMESTAMP
          `,
          [
            customer.id,
            targetDate,
            JSON.stringify(topPages),
            JSON.stringify(topCountries),
            JSON.stringify(topSources),
            JSON.stringify(topEvents),
            JSON.stringify(deviceSplit),
          ]
        )
      );

      // =====================================================
      // DEEL C: GOOGLE SEARCH CONSOLE
      // =====================================================
      // Als een klant een gsc_site_url heeft, halen we ook SEO-data op.
      if (customer.gsc_site_url) {
        const siteUrl = customer.gsc_site_url;

        const gscTopResponse = await safe(
          `GSC top queries voor ${customerLabel}`,
          async () =>
            gsc.searchanalytics.query({
              siteUrl,
              requestBody: {
                startDate: targetDate,
                endDate: targetDate,
                dimensions: ["query"],
                rowLimit: 5,
              },
            })
        );

        const gscTotalResponse = await safe(
          `GSC totals voor ${customerLabel}`,
          async () =>
            gsc.searchanalytics.query({
              siteUrl,
              requestBody: {
                startDate: targetDate,
                endDate: targetDate,
                rowLimit: 1,
              },
            })
        );

        const queryRows = gscTopResponse.data.rows ?? [];
        const totalRow = gscTotalResponse.data.rows?.[0];

        const clicks = totalRow?.clicks ?? 0;
        const impressions = totalRow?.impressions ?? 0;
        const ctr =
          totalRow?.ctr ?? (impressions > 0 ? clicks / impressions : null);
        const avgPosition = totalRow?.position ?? null;

        // Sla de dagelijkse GSC totals op
        await safe(`DB upsert gsc_daily_metrics voor ${customerLabel}`, async () =>
          db.execute(
            `
              INSERT INTO gsc_daily_metrics (
                customer_id,
                metric_date,
                clicks,
                impressions,
                ctr,
                avg_position,
                fetched_at
              )
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON DUPLICATE KEY UPDATE
                clicks = VALUES(clicks),
                impressions = VALUES(impressions),
                ctr = VALUES(ctr),
                avg_position = VALUES(avg_position),
                fetched_at = CURRENT_TIMESTAMP
            `,
            [customer.id, targetDate, clicks, impressions, ctr, avgPosition]
          )
        );

        // Bouw de top queries lijst op
        const topQueries = queryRows.map((row) => ({
          query: row.keys?.[0] ?? "(not set)",
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
          ctr: row.ctr ?? null,
          position: row.position ?? null,
        }));

        // Sla de top queries op als JSON
        await safe(`DB upsert gsc_daily_queries voor ${customerLabel}`, async () =>
          db.execute(
            `
              INSERT INTO gsc_daily_queries (
                customer_id,
                metric_date,
                top_queries,
                fetched_at
              )
              VALUES (?, ?, ?, CURRENT_TIMESTAMP)
              ON DUPLICATE KEY UPDATE
                top_queries = VALUES(top_queries),
                fetched_at = CURRENT_TIMESTAMP
            `,
            [customer.id, targetDate, JSON.stringify(topQueries)]
          )
        );
      } else {
        console.log(`ℹ️ ${customer.name}: geen gsc_site_url ingesteld, GSC wordt overgeslagen`);
      }

      successCount++;
      console.log(`✅ KLAAR ${customer.name} (${targetDate})`);
    } catch (error) {
      failureCount++;
      const message = `❌ FOUT ${customer.name}: ${error.message}`;
      console.error(message);
      errorSummary += `${message}\n`;
    }
  }

  // -------------------------------------------------------
  // 7. Werk de job_run af met de eindstatus
  // -------------------------------------------------------
  const status =
    failureCount === 0 ? "success" : successCount > 0 ? "partial" : "failed";

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
    [
      status,
      customers.length,
      successCount,
      failureCount,
      errorSummary.slice(0, 4000),
      jobRunId,
    ]
  );

  await db.end();

  console.log(
    `Daily fetch afgewerkt. status=${status} success=${successCount} failed=${failureCount}`
  );
}

// Start het script.
// Als er iets fataal fout loopt, stoppen we met exit code 1.
main().catch((error) => {
  console.error("Fatale fout in daily fetch script:");
  console.error(error);
  process.exit(1);
});
