"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ToggleCard from "@/app/components/admin/toggle-card";

type CustomerFormProps = {
  mode?: "create" | "edit";
  customerSlug?: string;
  initialValues?: {
    name?: string;
    contactEmail?: string;
    contactPerson?: string;
    bcc?: string;
    isActive?: boolean;
    reportEnabled?: boolean;
    ga4PropertyId?: string;
    gscSiteUrl?: string;
  };
};

export default function CustomerForm({
  mode = "create",
  customerSlug,
  initialValues,
}: CustomerFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initialValues?.name ?? "");
  const [contactEmail, setContactEmail] = useState(
    initialValues?.contactEmail ?? "",
  );
  const [contactPerson, setContactPerson] = useState(
    initialValues?.contactPerson ?? "",
  );
  const [bcc, setBcc] = useState(initialValues?.bcc ?? "");
  const [isActive, setIsActive] = useState(initialValues?.isActive ?? true);
  const [reportEnabled, setReportEnabled] = useState(
    initialValues?.reportEnabled ?? true,
  );
  const [ga4PropertyId, setGa4PropertyId] = useState(
    initialValues?.ga4PropertyId ?? "",
  );
  const [gscSiteUrl, setGscSiteUrl] = useState(initialValues?.gscSiteUrl ?? "");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    setFormSuccess("");

    try {
      const url =
        mode === "edit" && customerSlug
          ? `/api/admin/customers/${customerSlug}`
          : "/api/admin/customers";

      const method = mode === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          contactEmail,
          contactPerson,
          bcc,
          isActive,
          reportEnabled,
          ga4PropertyId,
          gscSiteUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.message || "Opslaan mislukt");
        setLoading(false);
        return;
      }

      setFormSuccess(
        mode === "edit"
          ? "Klant succesvol bijgewerkt."
          : "Klant succesvol toegevoegd.",
      );
      setLoading(false);

      setTimeout(() => {
        if (mode === "edit" && customerSlug) {
          router.push(`/admin/customers/${customerSlug}`);
        } else {
          router.push("/admin");
        }
        router.refresh();
      }, 1200);
    } catch {
      setFormError("Er ging iets mis bij het opslaan van de klant.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-white/70">Naam *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-white/30"
          placeholder="Bedrijfsnaam"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          Contact e-mail *
        </label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-white/30"
          placeholder="klant@bedrijf.nl"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          Contactpersoon
        </label>
        <input
          type="text"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-white/30"
          placeholder="Naam contactpersoon"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">BCC e-mail</label>
        <input
          type="email"
          value={bcc}
          onChange={(e) => setBcc(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-white/30"
          placeholder="intern@pixelplus.nl"
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
          GA4 Property ID *
        </label>
        <input
          type="text"
          value={ga4PropertyId}
          onChange={(e) => setGa4PropertyId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-white/30"
          placeholder="Bijv. 123456789"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          GSC Site URL *
        </label>
        <input
          type="text"
          value={gscSiteUrl}
          onChange={(e) => setGscSiteUrl(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none placeholder:text-white/30"
          placeholder="https://voorbeeld.nl"
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
        <span>
          {loading
            ? "Bezig..."
            : mode === "edit"
              ? "Klantgegevens opslaan"
              : "Klant toevoegen"}
        </span>

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
  );
}
