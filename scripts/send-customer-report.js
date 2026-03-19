require("dotenv").config({ path: "./app/.env" });

const mysql = require("mysql2/promise");
const crypto = require("crypto");
const Mailgun = require("mailgun.js");
const FormData = require("form-data");

function mustEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function formatMonthNL(yyyyMm01) {
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

function fmtInt(n) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString("nl-NL");
}

function fmtPct(delta) {
  if (typeof delta !== "number" || !Number.isFinite(delta)) return "—";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function deltaColor(delta) {
  if (typeof delta !== "number" || !Number.isFinite(delta)) return "#9a9a9a";
  if (delta > 1.5) return "#7CFFB2";
  if (delta < -1.5) return "#FF6B6B";
  return "#cfcfcf";
}

function buildMonthlyEmailHtml({
  customerName,
  monthStr,
  reportUrl,
  summary,
  comparison,
}) {
  const monthLabel = formatMonthNL(monthStr);
  const k = summary?.kpis ?? {};
  const gsc = summary?.gsc ?? {};
  const comp = comparison?.kpis ?? {};

  const newUsers = Number(k.new_users ?? 0);
  const newUsersDelta = comp?.new_users?.delta_pct;

  const conversions = Number(k.conversions ?? 0);
  const conversionsDelta = comp?.conversions?.delta_pct;

  const organicClicks = Number(gsc.clicks ?? 0);
  const organicClicksDelta = comp?.gsc_clicks?.delta_pct;

  const impressions = Number(gsc.impressions ?? 0);
  const missedOpportunity = Math.max(0, impressions - organicClicks);

  const prevClicks = Number(comp?.gsc_clicks?.previous ?? 0);
  const prevImpressions = Number(comp?.gsc_impressions?.previous ?? 0);
  const prevMissed = Math.max(0, prevImpressions - prevClicks);

  const missedDelta =
    prevMissed === 0
      ? missedOpportunity === 0
        ? 0
        : null
      : ((missedOpportunity - prevMissed) / prevMissed) * 100;

  const year = new Date().getUTCFullYear();

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1.0" /><title>Website Rapport</title></head>
<body style="margin:0;padding:0;background:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;">
  <div style="padding:24px;">
    <div style="max-width:600px;margin:0 auto;background:#0f0e0e;border-radius:12px;padding:28px;border:1px solid rgba(255,255,255,.08);">
      <div style="font-size:22px;font-weight:700;letter-spacing:.5px;">pixelplus<span style="opacity:.65;">+</span></div>
      <h1 style="font-size:18px;margin:16px 0 10px;line-height:1.3;">Uw maandelijkse website rapport</h1>
      <p style="margin:0 0 10px;color:#cfcfcf;font-size:14px;line-height:1.6;">
        <b style="color:#fff;">Beste ${customerName},</b><br/>
        Hierbij ontvangt u het prestatierapport van uw website voor <strong>${monthLabel}</strong>.
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:separate;border-spacing:10px;margin:10px -10px 0;">
        <tr>
          <td style="background:#1a1818;border-radius:10px;padding:18px;vertical-align:top;">
            <div style="font-size:13px;color:#fff;margin-bottom:10px;">Nieuwe gebruikers</div>
            <div style="font-size:22px;font-weight:700;">${fmtInt(newUsers)}</div>
            <div style="font-size:12px;margin-top:6px;color:${deltaColor(newUsersDelta)};">${fmtPct(newUsersDelta)} vs vorige maand</div>
          </td>
          <td style="background:#1a1818;border-radius:10px;padding:18px;vertical-align:top;">
            <div style="font-size:13px;color:#fff;margin-bottom:10px;">Conversies</div>
            <div style="font-size:22px;font-weight:700;">${fmtInt(conversions)}</div>
            <div style="font-size:12px;margin-top:6px;color:${deltaColor(conversionsDelta)};">${fmtPct(conversionsDelta)} vs vorige maand</div>
          </td>
        </tr>
        <tr>
          <td style="background:#1a1818;border-radius:10px;padding:18px;vertical-align:top;">
            <div style="font-size:13px;color:#fff;margin-bottom:10px;">Organisch verkeer</div>
            <div style="font-size:22px;font-weight:700;">${fmtInt(organicClicks)}</div>
            <div style="font-size:12px;margin-top:6px;color:${deltaColor(organicClicksDelta)};">${fmtPct(organicClicksDelta)} vs vorige maand</div>
          </td>
          <td style="background:#1a1818;border-radius:10px;padding:18px;vertical-align:top;">
            <div style="font-size:13px;color:#fff;margin-bottom:10px;">Gemiste kans</div>
            <div style="font-size:22px;font-weight:700;">${fmtInt(missedOpportunity)}</div>
            <div style="font-size:12px;margin-top:6px;color:${deltaColor(missedDelta)};">${fmtPct(missedDelta)} vs vorige maand</div>
          </td>
        </tr>
      </table>

      <div style="background:#1a1818;border-radius:10px;padding:22px;margin-top:16px;text-align:center;">
        <a href="${reportUrl}" style="display:inline-block;background:#fff;color:#000;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px;font-size:14px;">
          Bekijk mijn rapport
        </a>
      </div>

      <div style="margin-top:22px;padding-top:16px;border-top:1px solid rgba(255,255,255,.12);text-align:center;">
        <div style="font-size:12px;color:#8a8a8a;line-height:1.6;">
          <strong style="color:#fff;">Pixelplus Web Development</strong><br/>
          info@pixelplus.nl | +31 (0)45 20 518 56
        </div>
        <div style="margin-top:10px;font-size:11px;color:#6b6b6b;line-height:1.6;">
          &copy; ${year} Pixelplus.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function ttlDays() {
  const raw = process.env.MAGIC_LINK_TTL_DAYS;
  const n = raw ? Number(raw) : 35;
  return Number.isFinite(n) && n > 0 ? n : 35;
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function main() {
  const slug = process.env.CUSTOMER_SLUG;
  if (!slug) {
    throw new Error("Missing CUSTOMER_SLUG");
  }

  const db = await mysql.createConnection({
    uri: mustEnv("DATABASE_URL"),
  });

  const [customerRows] = await db.execute(
    `
      SELECT id, name, slug, contact_emails
      FROM customers
      WHERE slug = ?
      LIMIT 1
    `,
    [slug],
  );

  const customer = customerRows[0];
  if (!customer) {
    throw new Error("Klant niet gevonden");
  }

  const [reportRows] = await db.execute(
    `
      SELECT *
      FROM monthly_reports
      WHERE customer_id = ?
      ORDER BY report_month DESC
      LIMIT 1
    `,
    [customer.id],
  );

  const report = reportRows[0];
  if (!report) {
    throw new Error("Geen monthly report gevonden");
  }

  let summary = report.summary;
  let comparison = report.comparison;
  let contactEmails = customer.contact_emails;

  if (typeof summary === "string") summary = JSON.parse(summary);
  if (typeof comparison === "string") comparison = JSON.parse(comparison);
  if (typeof contactEmails === "string")
    contactEmails = JSON.parse(contactEmails);

  const token = makeToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + ttlDays() * 24 * 60 * 60 * 1000);

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

  const reportMonth = String(report.report_month).slice(0, 10);
  const reportUrl = `${mustEnv("MAGIC_LINK_BASE_URL")}/${customer.slug}/${token}`;

  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: mustEnv("MAILGUN_API_KEY"),
    url: process.env.MAILGUN_API_BASE_URL || "https://api.mailgun.net",
  });

  const subject = `Pixelplus rapport – ${formatMonthNL(reportMonth)} – ${customer.name}`;
  const html = buildMonthlyEmailHtml({
    customerName: customer.name,
    monthStr: reportMonth,
    reportUrl,
    summary,
    comparison,
  });

  for (const email of contactEmails) {
    await mg.messages.create(mustEnv("MAILGUN_DOMAIN"), {
      from: mustEnv("MAILGUN_FROM_EMAIL"),
      to: [email],
      subject,
      html,
      text: `Rapport ${formatMonthNL(reportMonth)} voor ${customer.name}: ${reportUrl}`,
    });
  }

  await db.execute(
    `
      UPDATE monthly_reports
      SET email_sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [report.id],
  );

  await db.end();

  console.log(`Performance mail opnieuw verstuurd voor ${customer.slug}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
