import { getDb } from "@/app/lib/db";
import crypto from "crypto";

export async function getAllCustomers() {
  const db = getDb();

  const [rows] = await db.execute(
    `
      SELECT
        id,
        name,
        slug,
        is_active,
        report_enabled,
        ga4_property_id,
        gsc_site_url
      FROM customers
      ORDER BY name ASC
    `,
  );

  return rows as any[];
}

export async function getCustomerBySlug(slug: string) {
  const db = getDb();

  const [rows] = await db.execute(
    `
      SELECT *
      FROM customers
      WHERE slug = ?
      LIMIT 1
    `,
    [slug],
  );

  return (rows as any[])[0] ?? null;
}

export async function getLatestReportForCustomer(customerId: number | string) {
  const db = getDb();

  const [rows] = await db.execute(
    `
      SELECT *
      FROM monthly_reports
      WHERE customer_id = ?
      ORDER BY report_month DESC
      LIMIT 1
    `,
    [customerId],
  );

  return (rows as any[])[0] ?? null;
}

export async function getTokenCustomerBySlugAndToken(
  slug: string,
  token: string,
) {
  const db = getDb();
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const [rows] = await db.execute(
    `
      SELECT c.*, mlt.expires_at, mlt.revoked_at, mlt.used_at
      FROM magic_link_tokens mlt
      INNER JOIN customers c ON c.id = mlt.customer_id
      WHERE c.slug = ?
        AND mlt.token_hash = ?
      LIMIT 1
    `,
    [slug, tokenHash],
  );

  const row = (rows as any[])[0] ?? null;

  if (!row) return null;

  const now = new Date();

  if (row.revoked_at) return null;
  if (row.expires_at && new Date(row.expires_at) < now) return null;

  return row;
}
