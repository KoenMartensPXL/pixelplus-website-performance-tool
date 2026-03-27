"use client";

import Image from "next/image";
import React from "react";
import { ChevronDown, ChevronUp, Eye, MousePointerClick } from "lucide-react";
import { monthLabel } from "@/app/lib/format";
import { buildCoreKpis, buildMarketingKpis } from "./kpi";
import BrandFooter from "./brand/brand-footer";
import { ListCard, TrendTag } from "@/app/components/dashboard-shared";

function BigKpiCard({
  label,
  value,
  trend,
  delta,
  icon,
}: {
  label: string;
  value: any;
  trend: "up" | "flat" | "down";
  delta: number | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-8 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="text-sm text-white/60">{label}</div>
        {icon ? <div className="text-white/35">{icon}</div> : null}
      </div>

      <div className="mt-4 text-4xl font-semibold tracking-tight text-white">
        {value ?? "—"}
      </div>

      <div className="mt-4">
        <TrendTag trend={trend} delta={delta} />
      </div>
    </div>
  );
}

function SmallKpiCard({ kpi }: { kpi: any }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-sm backdrop-blur">
      <div className="text-xs text-white/60">{kpi.label}</div>
      <div className="mt-2 text-2xl font-semibold text-white">
        {kpi.value ?? "—"}
      </div>
      <div className="mt-2">
        <TrendTag trend={kpi.trend} delta={kpi.delta} />
      </div>
    </div>
  );
}

export default function CustomerDashboardView({
  customer,
  report,
}: {
  customer: any;
  report: any | null;
}) {
  const [showMore, setShowMore] = React.useState(false);

  const summary = report?.summary ?? {};
  const comparison = report?.comparison ?? {};

  const core = buildCoreKpis(summary, comparison);
  const marketing = buildMarketingKpis(summary, comparison);

  const topPages = Array.isArray(summary?.top_pages) ? summary.top_pages : [];
  const topSources = Array.isArray(summary?.top_sources)
    ? summary.top_sources
    : [];

  const prettyMonth = report?.report_month
    ? monthLabel(report.report_month)
    : null;

  const bigNewUsers = core.find((k: any) => k.id === "new_users");
  const bigSessions = core.find((k: any) => k.id === "sessions");

  const otherKpis = [
    ...core.filter((k: any) => k.id !== "new_users" && k.id !== "sessions"),
    ...marketing,
  ];

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
                {prettyMonth
                  ? `Rapport voor ${prettyMonth}`
                  : "Nog geen rapport"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8">
        <section className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Belangrijkste cijfers
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Dit zijn de kerncijfers van deze maand.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <BigKpiCard
              label={bigNewUsers?.label ?? "Nieuwe gebruikers"}
              value={bigNewUsers?.value}
              trend={bigNewUsers?.trend ?? "flat"}
              delta={bigNewUsers?.delta ?? null}
              icon={<Eye className="h-6 w-6" />}
            />
            <BigKpiCard
              label={bigSessions?.label ?? "Sessies"}
              value={bigSessions?.value}
              trend={bigSessions?.trend ?? "flat"}
              delta={bigSessions?.delta ?? null}
              icon={<MousePointerClick className="h-6 w-6" />}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Overige cijfers
              </h2>
              <p className="text-sm text-white/60">
                Bekijk extra statistieken en marketingcijfers.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowMore((prev) => !prev)}
              className="inline-flex w-fit items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/90 transition hover:bg-white/10"
            >
              {showMore ? (
                <>
                  Minder tonen <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  Ik wil meer zien <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {showMore ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherKpis.map((kpi: any) => (
                <SmallKpiCard key={kpi.id} kpi={kpi} />
              ))}
            </div>
          ) : null}
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Meest bezochte pagina’s
            </h2>
            <p className="text-sm text-white/60">
              Welke pagina’s trekken de meeste aandacht.
            </p>
          </div>

          <ListCard title="Top pagina’s" items={topPages} />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Verkeersbronnen
            </h2>
            <p className="text-sm text-white/60">
              Hoe de bezoekers op de website terechtkomen.
            </p>
          </div>

          <ListCard title="Top verkeersbronnen" items={topSources} />
        </section>
      </main>

      <BrandFooter />
    </div>
  );
}
