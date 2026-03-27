"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from "lucide-react";

export type Trend = "up" | "flat" | "down";
export type KV = { key: string; value: number };

export function normalizeMonth(month: unknown) {
  if (!month) return "";

  if (typeof month === "string") {
    if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
    return month.slice(0, 10);
  }

  if (month instanceof Date) {
    return month.toISOString().slice(0, 10);
  }

  try {
    return new Date(month as any).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function monthDiff(fromMonth: string, toMonth: string) {
  const from = new Date(`${normalizeMonth(fromMonth)}T00:00:00Z`);
  const to = new Date(`${normalizeMonth(toMonth)}T00:00:00Z`);

  return (
    (from.getUTCFullYear() - to.getUTCFullYear()) * 12 +
    (from.getUTCMonth() - to.getUTCMonth())
  );
}

export function TrendTag({
  trend,
  delta,
}: {
  trend: Trend;
  delta: number | null;
}) {
  const cfg =
    trend === "up"
      ? {
          Icon: ArrowUpRight,
          cls: "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20",
        }
      : trend === "down"
        ? {
            Icon: ArrowDownRight,
            cls: "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20",
          }
        : {
            Icon: ArrowRight,
            cls: "bg-white/10 text-white/70 ring-1 ring-white/15",
          };

  if (typeof delta !== "number") {
    return <span className="text-xs text-white/40">Geen vergelijking</span>;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${cfg.cls}`}
    >
      <cfg.Icon className="h-3.5 w-3.5" />
      {delta >= 0 ? "+" : ""}
      {delta.toFixed(1)}%
      <span className="text-white/50">t.o.v. vorige maand</span>
    </span>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <div className="group relative">
      <Info className="h-4 w-4 text-white/35 transition group-hover:text-white/70" />
      <div className="pointer-events-none absolute right-0 top-6 z-10 w-72 rounded-xl border border-white/10 bg-black/95 p-3 text-xs text-white/80 opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100">
        {text}
      </div>
    </div>
  );
}

export function MissingTag({
  label = "Nog niet beschikbaar",
}: {
  label?: string;
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-200 ring-1 ring-amber-500/20">
      {label}
    </span>
  );
}

export function ListCard({ title, items }: { title: string; items: KV[] }) {
  const hasData = Array.isArray(items) && items.length > 0;
  const max = hasData ? Math.max(...items.map((i) => i.value), 1) : 1;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm backdrop-blur">
      <div className="text-sm font-semibold text-white/90">{title}</div>

      {!hasData ? (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-white/40">
            Nog geen data beschikbaar.
          </div>
          <MissingTag label="Lege lijst" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((it) => (
            <div key={it.key} className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm text-white/90">
                  {String(it.key || "").trim() ? it.key : "(not set)"}
                </div>
                <div className="text-sm font-medium text-white/70">
                  {it.value}
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-white/25"
                  style={{ width: `${Math.round((it.value / max) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
