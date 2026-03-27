"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ToggleCard from "@/app/components/admin/toggle-card";

export default function CustomerForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [bcc, setBcc] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [reportEnabled, setReportEnabled] = useState(true);
  const [ga4PropertyId, setGa4PropertyId] = useState("");
  const [gscSiteUrl, setGscSiteUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

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
        setFormError(data.message || "Klant aanmaken mislukt");
        setLoading(false);
        return;
      }

      setFormSuccess("Klant succesvol toegevoegd.");
      setLoading(false);

      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 1200);
    } catch {
      setFormError("Er ging iets mis bij het aanmaken van de klant.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleCreateCustomer} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm text-white/70">Naam *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-[#E5DED3] bg-[#FAF7F2] px-4 py-3 text-[#1A1A1A] outline-none placeholder:text-[#9A948A]"
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
          className="w-full rounded-xl border border-[#E5DED3] bg-[#FAF7F2] px-4 py-3 text-[#1A1A1A] outline-none placeholder:text-[#9A948A]"
          placeholder="Klant@bedrijf.nl"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          Contactpersoon <span className="text-white/30">(optioneel)</span>
        </label>
        <input
          type="text"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          className="w-full rounded-xl border border-[#E5DED3] bg-[#FAF7F2] px-4 py-3 text-[#1A1A1A] outline-none placeholder:text-[#9A948A]"
          placeholder="Naam voornaam"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm text-white/70">
          BCC e-mail <span className="text-white/30">(optioneel)</span>
        </label>
        <input
          type="email"
          value={bcc}
          onChange={(e) => setBcc(e.target.value)}
          className="w-full rounded-xl border border-[#E5DED3] bg-[#FAF7F2] px-4 py-3 text-[#1A1A1A] outline-none placeholder:text-[#9A948A]"
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
          className="w-full rounded-xl border border-[#E5DED3] bg-[#FAF7F2] px-4 py-3 text-[#1A1A1A] outline-none placeholder:text-[#9A948A]"
          required
          placeholder="G-XXXXXXXXXX"
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
          className="w-full rounded-xl border border-[#E5DED3] bg-[#FAF7F2] px-4 py-3 text-[#1A1A1A] outline-none placeholder:text-[#9A948A]"
          required
          placeholder="sc-domain:example.com"
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
        className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-black px-4 py-3 font-medium text-white transition hover:bg-black/90"
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
  );
}
