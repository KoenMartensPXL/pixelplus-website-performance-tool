"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BrandHeader from "@/app/components/brand/brand-header";
import BrandLoader from "@/app/components/brand/brand-loader";
import { Check } from "lucide-react";

type Customer = {
  id: number;
  name: string;
  slug: string;
  is_active: number | boolean;
  report_enabled: number | boolean;
  ga4_property_id: string;
  gsc_site_url: string;
};

function ToggleCard({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full rounded-xl border p-4 text-left transition ${
        checked
          ? "border-white/20 bg-white/10"
          : "border-white/10 bg-black/30 hover:bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-white">{title}</div>
          <p className="mt-1 text-sm text-white/50">{description}</p>
        </div>

        <div
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
            checked
              ? "border-white bg-white text-black"
              : "border-white/20 bg-transparent text-transparent"
          }`}
        >
          <Check className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  );
}

export default function AdminCustomersPage({
  initialCustomers,
}: {
  initialCustomers: Customer[];
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [reportEnabled, setReportEnabled] = useState(true);
  const [ga4PropertyId, setGa4PropertyId] = useState("");
  const [gscSiteUrl, setGscSiteUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(q),
    );
  }, [customers, search]);

  async function handleCreateCustomer(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          contactEmail,
          isActive,
          reportEnabled,
          ga4PropertyId,
          gscSiteUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || "Klant aanmaken mislukt");
        setLoading(false);
        return;
      }

      setCustomers((prev) => [data.customer, ...prev]);

      setName("");
      setContactEmail("");
      setIsActive(true);
      setReportEnabled(true);
      setGa4PropertyId("");
      setGscSiteUrl("");

      setFormSuccess("Klant succesvol toegevoegd.");
      setLoading(false);
    } catch {
      setFormError("Er ging iets mis bij het aanmaken van de klant.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <BrandHeader href="/admin" />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start gap-4">
              <div>
                <h1 className="text-3xl font-semibold">Klanten beheren</h1>
                <p className="mt-2 text-white/60">
                  Zoek op klantnaam en open meteen het juiste dashboard.
                </p>
              </div>
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
            <div className="flex items-start gap-4">
              <div>
                <h2 className="text-2xl font-semibold">Nieuwe klant</h2>
                <p className="mt-2 text-sm text-white/50">
                  Voeg klanten rechtstreeks toe vanuit de adminomgeving. De slug
                  wordt automatisch gegenereerd.
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateCustomer} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">Naam</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                  placeholder="Bijv. Nova Digital TEST"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  Contact e-mail
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                  placeholder="bijv. klant@bedrijf.be"
                  required
                />
              </div>

              <ToggleCard
                checked={isActive}
                onChange={setIsActive}
                title="Is actief"
                description="Actieve klanten worden meegenomen in fetches en rapportopbouw."
              />

              <ToggleCard
                checked={reportEnabled}
                onChange={setReportEnabled}
                title="Report enabled"
                description="Als dit uit staat, blijft data beschikbaar maar worden er geen rapportmails verzonden."
              />

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  GA4 Property ID
                </label>
                <input
                  type="text"
                  value={ga4PropertyId}
                  onChange={(e) => setGa4PropertyId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  GSC Site URL
                </label>
                <input
                  type="text"
                  value={gscSiteUrl}
                  onChange={(e) => setGscSiteUrl(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
                  required
                />
              </div>

              {formError ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {formError}
                </div>
              ) : null}

              {formSuccess ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {formSuccess}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 font-medium text-black transition hover:bg-white/90 disabled:opacity-50"
              >
                <span>{loading ? "Bezig..." : "Klant toevoegen"}</span>

                {loading ? (
                  <span className="inline-flex animate-[spin_1.8s_linear_infinite]">
                    <Image
                      src="/brand/brand-icon-4.svg"
                      alt="Loading"
                      width={64}
                      height={64}
                      className="h-4 w-4"
                    />
                  </span>
                ) : null}
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
