import * as dotenv from "dotenv";
dotenv.config({ path: "./app/.env" });

import React from "react";
import { render } from "@react-email/render";
import MonthlyReportEmail from "../app/emails/monthly-email-template";

function mustEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function formatMonthNL(yyyyMm01: string) {
  const d = new Date(`${yyyyMm01}T00:00:00Z`);
  const months = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  ];

  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

async function main() {
  const apiUrl = "http://comm.pixelplus.nl/api/v2/";
  const apiKey = mustEnv("COMM_API_KEY");
  const from = "no-reply@pixelplus.nl";
  const fromName = "Pixelplus";

  const to = "koen@family-martens.com";
  const bcc = "koen.martens@student.pxl.be";
  const customerName = "KoenBedrijf";
  const monthStr = "2026-02-01";
  const reportUrl = "https://example.com/report/test";

  const subject = `Pixelplus rapport – ${formatMonthNL(monthStr)} – ${customerName}`;

  const summary = {
    month: "2026-02-01",
    range: {
      start: "2026-02-01",
      end_exclusive: "2026-03-01",
    },
    kpis: {
      new_users: 120,
      active_users: 180,
      sessions: 250,
      pageviews: 640,
      engagement_rate_avg: 0.58,
      bounce_rate_avg: 0.42,
      avg_engagement_time_seconds_avg: 96,
      pages_per_session_avg: 2.56,
      conversions: 12,
      total_revenue: 0,
    },
    top_pages: [
      { key: "/", value: 220 },
      { key: "/diensten", value: 140 },
      { key: "/contact", value: 60 },
    ],
    top_countries: [
      { key: "Netherlands", value: 180 },
      { key: "Belgium", value: 40 },
      { key: "Germany", value: 12 },
    ],
    top_sources: [
      { key: "google", value: 150 },
      { key: "direct", value: 70 },
      { key: "linkedin", value: 20 },
    ],
    top_events: [
      { key: "page_view", value: 640 },
      { key: "session_start", value: 250 },
      { key: "form_submit", value: 12 },
    ],
    device_split: [
      { key: "desktop", value: 140 },
      { key: "mobile", value: 100 },
      { key: "tablet", value: 10 },
    ],
    gsc: {
      clicks: 85,
      impressions: 2400,
      ctr_avg: 0.035,
      position_avg: 18.2,
    },
    top_queries: [
      { query: "pixelplus", clicks: 20, impressions: 150 },
      { query: "marketing bureau", clicks: 12, impressions: 280 },
      { query: "seo agency", clicks: 8, impressions: 190 },
    ],
  };

  const comparison = {
    month: "2026-02-01",
    vs_month: "2026-01-01",
    kpis: {
      new_users: {
        key: "new_users",
        current: 120,
        previous: 100,
        delta_pct: 20,
        trend: "up",
      },
      active_users: {
        key: "active_users",
        current: 180,
        previous: 170,
        delta_pct: 5.88,
        trend: "up",
      },
      sessions: {
        key: "sessions",
        current: 250,
        previous: 230,
        delta_pct: 8.7,
        trend: "up",
      },
      pageviews: {
        key: "pageviews",
        current: 640,
        previous: 600,
        delta_pct: 6.67,
        trend: "up",
      },
      engagement_rate_avg: {
        key: "engagement_rate_avg",
        current: 0.58,
        previous: 0.55,
        delta_pct: 5.45,
        trend: "up",
      },
      pages_per_session_avg: {
        key: "pages_per_session_avg",
        current: 2.56,
        previous: 2.4,
        delta_pct: 6.67,
        trend: "up",
      },
      conversions: {
        key: "conversions",
        current: 12,
        previous: 10,
        delta_pct: 20,
        trend: "up",
      },
      gsc_clicks: {
        key: "gsc_clicks",
        current: 85,
        previous: 70,
        delta_pct: 21.43,
        trend: "up",
      },
      gsc_impressions: {
        key: "gsc_impressions",
        current: 2400,
        previous: 2200,
        delta_pct: 9.09,
        trend: "up",
      },
    },
  };

  const html = await render(
    React.createElement(MonthlyReportEmail, {
      customerName,
      monthStr,
      reportUrl,
      summary,
      comparison,
    }),
  );

  const payload = {
    apiKey,
    base64: 1,
    type: "send",
    from,
    fromName,
    to,
    bcc,
    subject,
    message: Buffer.from(html, "utf-8").toString("base64"),
  };

  console.log("API URL:", apiUrl);
  console.log("Payload keys:", Object.keys(payload));
  console.log("Payload preview:", {
    apiKey: "[REDACTED]",
    base64: payload.base64,
    type: payload.type,
    from: payload.from,
    fromName: payload.fromName,
    to: payload.to,
    bcc: payload.bcc,
    subject: payload.subject,
    messageLength: payload.message.length,
  });

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.text();

  console.log("STATUS:", res.status);
  console.log("OK:", res.ok);
  console.log("BODY:", body);

  if (!res.ok) {
    throw new Error(`API request failed with status ${res.status}: ${body}`);
  }

  console.log("Testmail verstuurd.");
}

main().catch((err) => {
  console.error("TEST FAILED:");
  console.error(err);
  process.exit(1);
});
