import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminCookieName } from "@/app/lib/auth";
import { getDb } from "@/app/lib/db";
import { generateUniqueSlug } from "@/app/lib/slug";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(adminCookieName);

    if (session?.value !== "authenticated") {
      return NextResponse.json(
        { message: "Niet geautoriseerd" },
        { status: 401 },
      );
    }

    const body = await request.json();

    const {
      name,
      contactEmail,
      contactPerson,
      bcc,
      isActive,
      reportEnabled,
      ga4PropertyId,
      gscSiteUrl,
    } = body;

    const normalizedContactPerson =
      typeof contactPerson === "string" && contactPerson.trim()
        ? contactPerson.trim()
        : null;

    const normalizedBcc =
      typeof bcc === "string" && bcc.trim() ? bcc.trim() : null;

    if (!name || !contactEmail || !ga4PropertyId || !gscSiteUrl) {
      return NextResponse.json(
        { message: "Niet alle verplichte velden zijn ingevuld." },
        { status: 400 },
      );
    }

    const db = getDb();
    const slug = await generateUniqueSlug(name);

    await db.execute(
      `
        INSERT INTO customers (
          name,
          slug,
          contact_emails,
          contact_person,
          bcc,
          is_active,
          report_enabled,
          ga4_property_id,
          gsc_site_url
        )
        VALUES (?, ?, JSON_ARRAY(?), ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        slug,
        contactEmail,
        normalizedContactPerson,
        normalizedBcc,
        isActive ? 1 : 0,
        reportEnabled ? 1 : 0,
        ga4PropertyId,
        gscSiteUrl,
      ],
    );

    const [rows] = await db.execute(
      `
        SELECT id, name, slug, contact_person, bcc, is_active, report_enabled, ga4_property_id, gsc_site_url
        FROM customers
        WHERE slug = ?
        LIMIT 1
      `,
      [slug],
    );

    const customer = (rows as any[])[0];

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || "Er ging iets mis." },
      { status: 500 },
    );
  }
}
