"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Activity,
  Eye,
  Info,
  MousePointerClick,
  Users,
  Globe,
} from "lucide-react";
import React from "react";
import { buildCoreKpis, buildTrafficKpis, buildMarketingKpis } from "./kpi";
import { monthLabel } from "@/app/lib/format";

type Trend = "up" | "flat" | "down";
type KV = { key: string; value: number };

function TrendTag({ trend, delta }: { trend: Trend; delta: number | null }) {
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
      {delta.toFixed(1)}%<span className="text-white/50">vs vorige maand</span>
    </span>
  );
}

function InfoTip({ text }: { text: string }) {
  return (
    <div className="group relative">
      <Info className="h-4 w-4 text-white/35 transition group-hover:text-white/70" />
      <div className="pointer-events-none absolute right-0 top-6 z-10 w-72 rounded-xl border border-white/10 bg-black/95 p-3 text-xs text-white/80 opacity-0 shadow-lg backdrop-blur transition group-hover:opacity-100">
        {text}
      </div>
    </div>
  );
}

function normalizeMonth(month: string) {
  if (!month) return "";
  if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
  return month.slice(0, 10);
}

function monthDiff(fromMonth: string, toMonth: string) {
  const from = new Date(`${normalizeMonth(fromMonth)}T00:00:00Z`);
  const to = new Date(`${normalizeMonth(toMonth)}T00:00:00Z`);

  return (
    (from.getUTCFullYear() - to.getUTCFullYear()) * 12 +
    (from.getUTCMonth() - to.getUTCMonth())
  );
}

function MissingTag({ label = "Nog niet beschikbaar" }: { label?: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-200 ring-1 ring-amber-500/20">
      {label}
    </span>
  );
}

function KpiCard({ kpi }: { kpi: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs text-white/60">{kpi.label}</div>
        <div className="flex items-center gap-2">
          {kpi.icon ? <div className="text-white/35">{kpi.icon}</div> : null}
          <InfoTip text={kpi.info} />
        </div>
      </div>

      <div className="mt-2 text-2xl font-semibold text-white">
        {kpi.value ?? <span className="text-white/40">—</span>}
      </div>

      <div className="mt-2 flex items-center gap-2">
        {kpi.fmtMissing ? <MissingTag /> : null}
        <TrendTag trend={kpi.trend} delta={kpi.delta} />
      </div>
    </div>
  );
}

function ListCard({ title, items }: { title: string; items: KV[] }) {
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

export default function DashboardView({
  customer,
  report,
  isAdmin = false,
  months = [],
}: {
  customer: any;
  report: any | null;
  isAdmin?: boolean;
  months?: string[];
  series?: any[];
  token?: string;
}) {
  const summary = report?.summary ?? {};
  const comparison = report?.comparison ?? {};

  const core = buildCoreKpis(summary, comparison).map((k: any) => {
    const iconMap: Record<string, React.ReactNode> = {
      new_users: <Users className="h-5 w-5" />,
      active_users: <Activity className="h-5 w-5" />,
      sessions: <MousePointerClick className="h-5 w-5" />,
      pageviews: <Eye className="h-5 w-5" />,
      engagement_rate_avg: <Activity className="h-5 w-5" />,
    };
    return { ...k, icon: iconMap[k.id] };
  });

  const traffic = buildTrafficKpis(summary, comparison).map((k: any) => {
    const iconMap: Record<string, React.ReactNode> = {
      avg_eng_time: <Activity className="h-5 w-5" />,
      pages_per_session: <Eye className="h-5 w-5" />,
      bounce_rate: <ArrowDownRight className="h-5 w-5" />,
    };
    return { ...k, icon: iconMap[k.id] };
  });

  const marketing = buildMarketingKpis(summary, comparison).map((k: any) => {
    const iconMap: Record<string, React.ReactNode> = {
      conversions: <MousePointerClick className="h-5 w-5" />,
      keywords: <Globe className="h-5 w-5" />,
    };
    return { ...k, icon: iconMap[k.id] };
  });

  const topPages = Array.isArray(summary?.top_pages) ? summary.top_pages : [];
  const topCountries = Array.isArray(summary?.top_countries)
    ? summary.top_countries
    : [];
  const topSources = Array.isArray(summary?.top_sources)
    ? summary.top_sources
    : [];
  const deviceSplit = Array.isArray(summary?.device_split)
    ? summary.device_split
    : [];

  const prettyMonth = report?.report_month
    ? monthLabel(report.report_month)
    : null;

  const reportTitle = prettyMonth
    ? `Rapport voor ${prettyMonth}`
    : "Rapport wordt nog opgebouwd";

  const currentReportMonth = report?.report_month
    ? normalizeMonth(report.report_month)
    : null;

  const comparisonMonthFromReport = report?.comparison?.vs_month
    ? normalizeMonth(report.comparison.vs_month)
    : null;

  const availableComparisonMonths = React.useMemo(() => {
    if (!currentReportMonth || !Array.isArray(months)) return [];

    return months
      .map(normalizeMonth)
      .filter((month) => month && month !== currentReportMonth)
      .filter((month) => {
        const diff = monthDiff(currentReportMonth, month);
        return diff >= 1 && diff <= 12;
      })
      .sort((a, b) => b.localeCompare(a));
  }, [months, currentReportMonth]);

  const [selectedComparisonMonth, setSelectedComparisonMonth] = React.useState(
    comparisonMonthFromReport &&
      availableComparisonMonths.includes(comparisonMonthFromReport)
      ? comparisonMonthFromReport
      : availableComparisonMonths[0] || "",
  );

  React.useEffect(() => {
    const nextValue =
      comparisonMonthFromReport &&
      availableComparisonMonths.includes(comparisonMonthFromReport)
        ? comparisonMonthFromReport
        : availableComparisonMonths[0] || "";

    setSelectedComparisonMonth(nextValue);
  }, [comparisonMonthFromReport, availableComparisonMonths]);

  console.log("report.report_month", report?.report_month);
  console.log("months", months);
  console.log("availableComparisonMonths", availableComparisonMonths);

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-6">
            <Image
              src="/brand/Pixelplus-Logo.png"
              alt="Pixelplus"
              width={180}
              height={32}
              className="h-8 w-auto object-contain"
              priority
            />
            <div className="h-10 w-px bg-white/10" />
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold text-white">
                {customer?.name ?? "Klant"}
              </span>
              <span className="text-sm text-white/50">
                {customer?.gsc_site_url ?? "Nog geen domein beschikbaar"}
              </span>
            </div>
          </div>

          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Terug naar klanten
            </Link>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">
                {reportTitle}
              </h1>
              <p className="mt-1 text-sm text-white/60">
                {selectedComparisonMonth
                  ? `Er wordt vergeleken met ${monthLabel(selectedComparisonMonth)}.`
                  : "Er wordt vergeleken met vorige maand."}
              </p>
              {!report ? (
                <p className="mt-2 text-sm text-amber-200/80">
                  Er is nog geen rapport beschikbaar voor deze klant.
                </p>
              ) : null}
            </div>

            <div className="sm:text-right">
              <div className="text-xs text-white/50">
                Er wordt vergeleken met
              </div>

              {availableComparisonMonths.length > 0 ? (
                <div className="mt-2">
                  <select
                    value={selectedComparisonMonth}
                    onChange={(e) => setSelectedComparisonMonth(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white outline-none transition hover:bg-white/10 sm:min-w-[240px]"
                  >
                    {availableComparisonMonths.map((month) => {
                      const isPreviousMonth =
                        currentReportMonth &&
                        monthDiff(currentReportMonth, month) === 1;

                      return (
                        <option
                          key={month}
                          value={month}
                          className="bg-black text-white"
                        >
                          {isPreviousMonth ? "Vorige maand" : monthLabel(month)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="mt-2 text-sm font-semibold text-white">—</div>
              )}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-white">Kern KPI’s</h2>
            <p className="text-sm text-white/60">
              De belangrijkste statistieken van deze maand.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {core.map((k: any) => (
              <KpiCard key={k.id} kpi={k} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Web verkeer & gedrag
            </h2>
            <p className="text-sm text-white/60">
              Extra statistieken over sessies en interactie.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2 lg:grid-cols-3">
              {traffic.map((k: any) => (
                <KpiCard key={k.id} kpi={k} />
              ))}
            </div>
            <ListCard title="Apparaatgebruik" items={deviceSplit} />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Inhoud & interactie
            </h2>
            <p className="text-sm text-white/60">
              Welke pagina’s en landen presteren het best.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ListCard title="Meest bezochte pagina’s" items={topPages} />
            <ListCard title="Top landen" items={topCountries} />
          </div>
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Resultaat & marketing
            </h2>
            <p className="text-sm text-white/60">
              Conversies, zoekwoorden en verkeersbronnen.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="grid grid-cols-1 gap-3">
              {marketing.map((k: any) => (
                <KpiCard key={k.id} kpi={k} />
              ))}
            </div>
            <div className="lg:col-span-2">
              <ListCard title="Verkeersbronnen" items={topSources} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
