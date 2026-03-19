"use client";

import { useState } from "react";

export default function SendReportButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSend() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`/api/admin/customers/${slug}/send-report`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Versturen mislukt");
        setLoading(false);
        return;
      }

      setMessage("Mail opnieuw verstuurd");
      setLoading(false);
    } catch {
      setError("Er ging iets mis");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div className="text-sm text-white/60">Performance mail</div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10 disabled:opacity-50"
        >
          {loading ? "Bezig..." : "Opnieuw versturen"}
        </button>

        {message ? <span className="text-xs text-emerald-300">✓</span> : null}

        {error ? <span className="text-xs text-red-400">!</span> : null}
      </div>
    </div>
  );
}
