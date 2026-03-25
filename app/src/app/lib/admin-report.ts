import crypto from "crypto";
import { getDb } from "./db";
import { sendMonthlyReportEmail } from "./send-monthly-report-email";

function mustEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

function ttlDays() {
  const raw = process.env.MAGIC_LINK_TTL_DAYS;
  const n = raw ? Number(raw) : 35;
  return Number.isFinite(n) && n > 0 ? n : 35;
}

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value !== "string") return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type CustomerRow = {
  id: number;
  name: string;
  slug: string;
  bcc?: string;
  contact_emails: string | string[] | null;
  report_enabled?: number;
};

type ReportRow = {
  id: number;
  report_month: string | Date;
  summary: unknown;
  comparison: unknown;
};

async function getCustomerBySlug(slug: string): Promise<CustomerRow> {
  const db = getDb();

  const [customerRows] = await db.execute(
    `
      SELECT id, name, slug, bcc, contact_emails, report_enabled
      FROM customers
      WHERE slug = ?
      LIMIT 1
    `,
    [slug],
  );

  const customer = (customerRows as CustomerRow[])[0];

  if (!customer) {
    throw new Error("Klant niet gevonden");
  }

  return customer;
}

async function getLatestReportForCustomerId(
  customerId: number,
): Promise<ReportRow> {
  const db = getDb();

  const [reportRows] = await db.execute(
    `
      SELECT *
      FROM monthly_reports
      WHERE customer_id = ?
      ORDER BY report_month DESC
      LIMIT 1
    `,
    [customerId],
  );

  const report = (reportRows as ReportRow[])[0];

  if (!report) {
    throw new Error("Geen monthly report gevonden voor deze klant");
  }

  return report;
}

async function createMagicLinkForCustomer(
  customerId: number,
  customerSlug: string,
) {
  const db = getDb();

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
    [customerId, tokenHash, expiresAt],
  );

  const baseUrl = mustEnv("MAGIC_LINK_BASE_URL");

  return `${baseUrl}/${customerSlug}/${token}`;
}

function normalizeContactEmails(raw: string | string[] | null): string[] {
  const parsed = safeJsonParse<string[] | string>(raw, []);

  if (Array.isArray(parsed)) {
    return parsed.filter(
      (email) => typeof email === "string" && email.trim().length > 0,
    );
  }

  if (typeof parsed === "string" && parsed.trim().length > 0) {
    return [parsed.trim()];
  }

  return [];
}

export async function resendLatestReportForCustomer(slug: string) {
  const db = getDb();

  const customer = await getCustomerBySlug(slug);
  const report = await getLatestReportForCustomerId(customer.id);

  const summary = safeJsonParse<any>(report.summary, {});
  const comparison = safeJsonParse<any>(report.comparison, {});
  const contactEmails = normalizeContactEmails(customer.contact_emails);

  if (contactEmails.length === 0) {
    throw new Error("Geen contact_emails gevonden voor deze klant");
  }

  const reportUrl = await createMagicLinkForCustomer(
    customer.id,
    customer.slug,
  );

  function toLocalIsoDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  const reportMonth =
    report.report_month instanceof Date
      ? toLocalIsoDate(report.report_month)
      : String(report.report_month).slice(0, 10);

  for (const email of contactEmails) {
    await sendMonthlyReportEmail({
      to: email,
      customerName: customer.name,
      monthStr: reportMonth,
      bcc: customer.bcc,
      reportUrl,
      summary,
      comparison,
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

  return {
    customerName: customer.name,
    customerSlug: customer.slug,
    reportMonth,
    recipients: contactEmails,
    reportUrl,
  };
}

export async function sendLatestReportsForEnabledCustomers() {
  const db = getDb();

  const [customerRows] = await db.execute(
    `
      SELECT slug
      FROM customers
      WHERE report_enabled = 1
      ORDER BY id ASC
    `,
  );

  const customers = customerRows as Array<{ slug: string }>;
  const results: Array<{
    slug: string;
    success: boolean;
    result?: unknown;
    error?: string;
  }> = [];

  for (const customer of customers) {
    try {
      const result = await resendLatestReportForCustomer(customer.slug);

      results.push({
        slug: customer.slug,
        success: true,
        result,
      });
    } catch (error: any) {
      results.push({
        slug: customer.slug,
        success: false,
        error: error?.message || "Onbekende fout",
      });
    }
  }

  return {
    total: results.length,
    successCount: results.filter((x) => x.success).length,
    failureCount: results.filter((x) => !x.success).length,
    results,
  };
}
