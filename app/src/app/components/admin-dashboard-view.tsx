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
  Mail,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import {
  TrendTag,
  InfoTip,
  MissingTag,
  ListCard,
  normalizeMonth,
  monthDiff,
} from "@/app/components/dashboard-shared";
import React from "react";
import { buildCoreKpis, buildTrafficKpis, buildMarketingKpis } from "./kpi";
import { monthLabel } from "@/app/lib/format";
import BrandFooter from "./brand/brand-footer";

type KV = { key: string; value: number };

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

function Toast({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose: () => void;
}) {
  const isSuccess = type === "success";

  return (
    <div
      className={`pointer-events-auto flex min-w-[280px] max-w-[360px] items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${
        isSuccess
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          : "border-red-500/20 bg-red-500/10 text-red-200"
      }`}
    >
      <div className="mt-0.5">
        {isSuccess ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <AlertCircle className="h-5 w-5" />
        )}
      </div>

      <div className="flex-1 text-sm">{message}</div>

      <button
        type="button"
        onClick={onClose}
        className="text-white/50 transition hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function SendReportAction({ slug }: { slug: string }) {
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (!toast) return;

    const timeout = setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => clearTimeout(timeout);
  }, [toast]);

  async function handleSend() {
    setLoading(true);
    setToast(null);

    try {
      const res = await fetch(`/api/admin/customers/${slug}/send-report`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setToast({
          type: "error",
          message: data.message || "Versturen mislukt",
        });
        setLoading(false);
        return;
      }

      setToast({
        type: "success",
        message: data.message || "Mail opnieuw verstuurd",
      });
      setLoading(false);
    } catch {
      setToast({
        type: "error",
        message: "Er ging iets mis bij het versturen",
      });
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Mail className="h-4 w-4" />
          {loading ? "Bezig..." : "Performance mail opnieuw versturen"}
        </button>
      </div>

      <div className="pointer-events-none fixed right-4 top-4 z-[100] flex flex-col gap-3">
        {toast ? (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        ) : null}
      </div>
    </>
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
          </div>

          {isAdmin ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              {customer?.slug ? (
                <SendReportAction slug={customer.slug} />
              ) : null}

              <Link
                href="/admin"
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
                Terug naar klanten
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-lg font-semibold text-white">
                {customer?.name ?? "Klant"}
              </span>
              <h1 className="text-base font-semibold text-white">
                {reportTitle}
              </h1>
              <span className="text-sm text-white/50">
                {customer?.gsc_site_url ?? "Nog geen domein beschikbaar"}
              </span>
              <br />
              <span className="text-sm text-white/50">
                Contactpersoon:{" "}
                {customer?.contact_person ?? "Geen contactpersoon"}
              </span>
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
            <h2 className="text-base font-semibold text-white">
              Belangrijkste cijfers
            </h2>
            <p className="text-sm text-white/60">
              De belangrijkste statistieken van deze maand
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
              Extra statistieken over sessies en interactie
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
              Welke pagina’s en landen presteren het best
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
              Conversies, zoekwoorden en verkeersbronnen
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
      <BrandFooter />
    </div>
  );
}
