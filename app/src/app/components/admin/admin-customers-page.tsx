"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import BrandHeader from "@/app/components/brand/brand-header";
import BrandLoader from "@/app/components/brand/brand-loader";
import { Plus } from "lucide-react";

type Customer = {
  id: number;
  name: string;
  slug: string;
  contact_person?: string | null;
  bcc?: string | null;
  is_active: number | boolean;
  report_enabled: number | boolean;
  ga4_property_id: string;
  gsc_site_url: string;
};

export default function AdminCustomersPage({
  initialCustomers,
}: {
  initialCustomers: Customer[];
}) {
  const [customers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(q),
    );
  }, [customers, search]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <BrandHeader href="/admin" />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div>
              <h1 className="text-3xl font-semibold">Klanten beheren</h1>
              <p className="mt-2 text-white/60">
                Zoek op klantnaam en open meteen het juiste dashboard.
              </p>
            </div>

            <div className="mt-6">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op klantnaam..."
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-white/30"
              />
            </div>

            <div className="mt-5 grid gap-3">
              {filteredCustomers.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
                  <BrandLoader label="Geen klanten gevonden..." />
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <Link
                    key={customer.id}
                    href={`/admin/customers/${customer.slug}`}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-4 transition hover:bg-white/10"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="mt-1 text-sm text-white/40">
                          {customer.gsc_site_url}
                        </div>
                      </div>

                      <div className="text-right text-xs text-white/35">
                        Open dashboard
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div>
              <h2 className="text-2xl font-semibold">Nieuwe klant</h2>
              <p className="mt-2 text-sm text-white/50">
                Voeg een nieuwe klant toe.
              </p>
            </div>

            <Link
              href="/admin/customers/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-white/90"
            >
              <Plus className="h-4 w-4" />
              Klant toevoegen
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}
