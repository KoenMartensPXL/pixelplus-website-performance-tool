import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/app/lib/db";
import { adminCookieName } from "@/app/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(adminCookieName);

    if (session?.value !== "authenticated") {
      return NextResponse.json(
        { message: "Niet geautoriseerd" },
        { status: 401 },
      );
    }

    const { slug } = await params;
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

    if (!name || !contactEmail || !ga4PropertyId || !gscSiteUrl) {
      return NextResponse.json(
        { message: "Vul alle verplichte velden in." },
        { status: 400 },
      );
    }

    const db = getDb();

    const [existingRows] = await db.execute(
      `
        SELECT id
        FROM customers
        WHERE slug = ?
        LIMIT 1
      `,
      [slug],
    );

    const existingCustomer = (existingRows as any[])[0];

    if (!existingCustomer) {
      return NextResponse.json(
        { message: "Klant niet gevonden." },
        { status: 404 },
      );
    }

    await db.execute(
      `
        UPDATE customers
        SET
          name = ?,
          contact_emails = ?,
          contact_person = ?,
          bcc = ?,
          is_active = ?,
          report_enabled = ?,
          ga4_property_id = ?,
          gsc_site_url = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE slug = ?
      `,
      [
        name,
        JSON.stringify([contactEmail]),
        contactPerson || null,
        bcc || null,
        isActive ? 1 : 0,
        reportEnabled ? 1 : 0,
        ga4PropertyId,
        gscSiteUrl,
        slug,
      ],
    );

    const [updatedRows] = await db.execute(
      `
        SELECT *
        FROM customers
        WHERE slug = ?
        LIMIT 1
      `,
      [slug],
    );

    return NextResponse.json({
      success: true,
      message: "Klant succesvol bijgewerkt.",
      customer: (updatedRows as any[])[0],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Er ging iets mis bij het bijwerken van de klant." },
      { status: 500 },
    );
  }
}
