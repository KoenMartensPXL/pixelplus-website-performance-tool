import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { isAdminLoggedIn } from "@/app/lib/auth";
import BrandHeader from "@/app/components/brand/brand-header";
import CustomerForm from "@/app/components/admin/customer-form";

export default async function NewCustomerPage() {
  const loggedIn = await isAdminLoggedIn();

  if (!loggedIn) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-[#F6F1E8] text-[#1A1A1A]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <BrandHeader href="/admin" />

        <div className="mt-10">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5DED3] bg-white px-4 py-2 text-sm text-[#1A1A1A] transition hover:bg-[#F3ECE2]"
          >
            <ArrowLeft className="h-4 w-4" />
            Terug naar overzicht
          </Link>
        </div>

        <section className="mt-6 rounded-3xl border border-[#E5DED3] bg-white p-8 shadow-sm">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Nieuwe klant
            </h1>

            <p className="mt-2 text-sm text-[#6B6B6B]">
              Voeg een nieuwe klant toe. De slug wordt automatisch gegenereerd.
            </p>
          </div>

          <div className="mt-8">
            <CustomerForm />
          </div>
        </section>
      </div>
    </main>
  );
}
