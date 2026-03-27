import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdminLoggedIn } from "@/app/lib/auth";
import { getCustomerBySlug } from "@/app/lib/dashboard";
import BrandHeader from "@/app/components/brand/brand-header";
import CustomerForm from "@/app/components/admin/customer-form";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const loggedIn = await isAdminLoggedIn();

  if (!loggedIn) {
    redirect("/login");
  }

  const { slug } = await params;
  const customer = await getCustomerBySlug(slug);

  if (!customer) {
    notFound();
  }

  let contactEmail = "";
  const rawEmails = customer.contact_emails;

  if (Array.isArray(rawEmails) && rawEmails.length > 0) {
    contactEmail = rawEmails[0];
  } else if (typeof rawEmails === "string") {
    try {
      const parsed = JSON.parse(rawEmails);
      if (Array.isArray(parsed) && parsed.length > 0) {
        contactEmail = parsed[0];
      }
    } catch {
      contactEmail = rawEmails;
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <BrandHeader href="/admin" />

        <div className="mt-8">
          <Link
            href={`/admin/customers/${customer.slug}`}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar dashboard
          </Link>
        </div>

        <section className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div>
            <h1 className="text-3xl font-semibold">Klantgegevens bewerken</h1>
            <p className="mt-2 text-sm text-white/50">
              Werk de gegevens van deze klant bij en sla de wijzigingen op.
            </p>
          </div>

          <div className="mt-6">
            <CustomerForm
              mode="edit"
              customerSlug={customer.slug}
              initialValues={{
                name: customer.name ?? "",
                contactEmail,
                contactPerson: customer.contact_person ?? "",
                bcc: customer.bcc ?? "",
                isActive: Boolean(customer.is_active),
                reportEnabled: Boolean(customer.report_enabled),
                ga4PropertyId: customer.ga4_property_id ?? "",
                gscSiteUrl: customer.gsc_site_url ?? "",
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
