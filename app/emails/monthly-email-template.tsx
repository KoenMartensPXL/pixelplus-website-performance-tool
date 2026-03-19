import * as React from "react";
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Heading,
  Link,
  Img,
} from "@react-email/components";

type TopItem = { key: string; value: number };

type Summary = {
  kpis: {
    new_users: number;
    sessions: number;
  };
  top_pages?: TopItem[];
  top_countries?: TopItem[];
};

type Comparison = {
  kpis: {
    new_users?: {
      delta_pct: number | null;
    };
    sessions?: {
      delta_pct: number | null;
    };
  };
};

export type MonthlyReportEmailProps = {
  customerName?: string;
  monthStr?: string;
  reportUrl?: string;
  summary?: Summary;
  comparison?: Comparison;
};

export const PreviewProps: MonthlyReportEmailProps = {
  customerName: "M25 Watches",
  monthStr: "2026-01-01",
  reportUrl: "https://example.com/report",
  summary: {
    kpis: {
      new_users: 12847,
      sessions: 24561,
    },
    top_pages: [{ key: "/contact", value: 15234 }],
    top_countries: [{ key: "Nederland", value: 14562 }],
  },
  comparison: {
    kpis: {
      new_users: { delta_pct: 25.5 },
      sessions: { delta_pct: 15.1 },
    },
  },
};

function formatMonthNL(yyyyMm01: string) {
  const d = new Date(`${yyyyMm01}T00:00:00Z`);
  const months = [
    "januari",
    "februari",
    "maart",
    "april",
    "mei",
    "juni",
    "juli",
    "augustus",
    "september",
    "oktober",
    "november",
    "december",
  ];

  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function fmtInt(n: number | null | undefined) {
  const x = Number(n ?? 0);
  if (!Number.isFinite(x)) return "0";
  return Math.round(x).toLocaleString("nl-NL");
}

function fmtPct(delta: number | null | undefined) {
  if (typeof delta !== "number" || !Number.isFinite(delta)) return "—";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)}%`;
}

function deltaColor(delta: number | null | undefined) {
  if (typeof delta !== "number" || !Number.isFinite(delta)) return "#BFB7B7";
  if (delta > 1.5) return "#05E99D";
  if (delta < -1.5) return "#FF6B6B";
  return "#BFB7B7";
}

export default function MonthlyReportEmail({
  customerName = "M25 Watches",
  monthStr = "2026-01-01",
  reportUrl = "https://example.com/report",
  summary = {
    kpis: {
      new_users: 12847,
      sessions: 24561,
    },
    top_pages: [{ key: "/contact", value: 15234 }],
    top_countries: [{ key: "Nederland", value: 14562 }],
  },
  comparison = {
    kpis: {
      new_users: { delta_pct: 25.5 },
      sessions: { delta_pct: 15.1 },
    },
  },
}: MonthlyReportEmailProps) {
  const monthLabel = formatMonthNL(monthStr);

  const newUsers = fmtInt(summary.kpis.new_users);
  const sessions = fmtInt(summary.kpis.sessions);

  const newUsersGrowth = `${fmtPct(comparison.kpis.new_users?.delta_pct)} vs vorige maand`;
  const sessionsGrowth = `${fmtPct(comparison.kpis.sessions?.delta_pct)} vs vorige maand`;

  const topPage = summary.top_pages?.[0]?.key ?? "-";
  const topPageViews = `${fmtInt(summary.top_pages?.[0]?.value ?? 0)} weergaven`;

  const topCountry = summary.top_countries?.[0]?.key ?? "-";
  const topCountryUsers = `${fmtInt(summary.top_countries?.[0]?.value ?? 0)} gebruikers`;

  return (
    <Html>
      <Head />
      <Preview>Uw maandelijkse website rapport</Preview>
      <Body style={main}>
        <Container style={wrapper}>
          <Section style={header}>
            <Img
              src="https://pixelplus-website-performance-tool.vercel.app/brand/Pixelplus-Logo.png"
              alt="Pixelplus Logo"
              style={logo}
            />
          </Section>

          <Section style={content}>
            <Heading as="h1" style={h1}>
              Uw maandelijkse website rapport
            </Heading>

            <Text style={text}>
              Beste <strong>{customerName}</strong>,
            </Text>

            <Text style={text}>
              Hierbij ontvangt u het prestatierapport van uw website voor{" "}
              <strong>{monthLabel}</strong>. Bekijk hieronder een samenvatting
              van de belangrijkste cijfers.
            </Text>

            <Section style={statsGrid}>
              <Row>
                <Column style={cardColumnLeft}>
                  <StatCard
                    title="Nieuwe gebruikers"
                    value={newUsers}
                    sub={newUsersGrowth}
                    subColor={deltaColor(comparison.kpis.new_users?.delta_pct)}
                  />
                </Column>
                <Column style={cardColumnRight}>
                  <StatCard
                    title="Sessies"
                    value={sessions}
                    sub={sessionsGrowth}
                    subColor={deltaColor(comparison.kpis.sessions?.delta_pct)}
                  />
                </Column>
              </Row>

              <Row>
                <Column style={cardColumnLeft}>
                  <StatCard
                    title="Populairste pagina"
                    value={topPage}
                    sub={topPageViews}
                  />
                </Column>
                <Column style={cardColumnRight}>
                  <StatCard
                    title="Top land"
                    value={topCountry}
                    sub={topCountryUsers}
                  />
                </Column>
              </Row>
            </Section>

            <Section style={ctaBox}>
              <Text style={ctaText}>
                Bekijk uw volledig dashboard met gedetailleerde statistieken,
                grafieken en groeikansen via onderstaande knop.
              </Text>

              <Section style={{ textAlign: "center" }}>
                <Link href={reportUrl} style={button}>
                  Bekijk mijn rapport
                </Link>
              </Section>

              <Text style={smallMuted}>Deze link is 30 dagen geldig</Text>
            </Section>

            <Text style={text}>
              Heeft u vragen over uw cijfers? Of wilt u meer uit uw website
              halen? Neem contact met ons op voor een vrijblijvend
              adviesgesprek.
            </Text>

            <Row>
              <Column style={{ width: "70%", verticalAlign: "top" }}>
                <Text style={text}>
                  Met vriendelijke groet,
                  <br />
                  <strong>Team Pixelplus</strong>
                </Text>
              </Column>

              <Column
                style={{
                  width: "30%",
                  textAlign: "right",
                  verticalAlign: "middle",
                }}
              >
                <Img
                  src="https://pixelplus-website-performance-tool.vercel.app/brand/PixelplusIconLogo.png"
                  alt="Pixelplus icons"
                  style={{
                    width: "150px",
                    height: "auto",
                    display: "inline-block",
                  }}
                />
              </Column>
            </Row>

            <Section style={footer}>
              <Text style={footerTitle}>Pixelplus Interactieve Media</Text>
              <Text style={footerText}>
                info@pixelplus.nl | +31 (0)20 123 4567d
              </Text>

              <Text style={footerSmall}>
                Deze e-mail is automatisch gegenereerd op basis van website
                data. Data wordt dagelijks om 00:00 uur bijgewerkt via Google
                Analytics 4.
              </Text>

              <Text style={footerSmall}>
                © 2026 Pixelplus. Alle rechten voorbehouden.
              </Text>
            </Section>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

type StatCardProps = {
  title: string;
  value: string;
  sub: string;
  subColor?: string;
};

function StatCard({ title, value, sub, subColor = "#BFB7B7" }: StatCardProps) {
  return (
    <Section style={card}>
      <Text style={cardTitle}>{title}</Text>
      <Text style={cardValue}>{value}</Text>
      <Text style={{ ...cardSub, color: subColor }}>{sub}</Text>
    </Section>
  );
}

const logo = {
  width: "175px",
  height: "auto",
  marginBottom: "12px",
  display: "inline-block",
};

const logoFooter = {};

const footer = {
  backgroundColor: "#2a1f22",
  padding: "24px 32px 12px",
  textAlign: "center" as const,
};

const footerTitle = {
  color: "#ffffff",
  fontSize: "20px",
  lineHeight: "28px",
  fontWeight: "700",
  margin: "0 0 8px",
};

const footerText = {
  color: "#ffffff",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 14px",
};

const footerSmall = {
  color: "#d7d1d1",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 10px",
};

const main = {
  backgroundColor: "#e5e5e5",
  margin: 0,
  padding: "16px 0",
  fontFamily: "Inter, Arial, Helvetica, sans-serif",
};

const wrapper = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#000000",
  borderRadius: "20px",
  overflow: "hidden" as const,
};

const header = {
  padding: "28px 32px 8px 32px",
  textAlign: "center" as const,
};

const content = {
  padding: "8px 32px 24px 32px",
};

const h1 = {
  color: "#ffffff",
  fontSize: "30px",
  lineHeight: "38px",
  fontWeight: "700",
  margin: "0 0 20px",
};

const text = {
  color: "#f3f3f3",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 18px",
};

const statsGrid = {
  margin: "28px 0",
};

const cardColumnLeft = {
  width: "50%",
  paddingRight: "8px",
  paddingBottom: "16px",
  verticalAlign: "top" as const,
};

const cardColumnRight = {
  width: "50%",
  paddingLeft: "8px",
  paddingBottom: "16px",
  verticalAlign: "top" as const,
};

const card = {
  backgroundColor: "#2a1f22",
  borderRadius: "12px",
  padding: "18px 16px",
};

const cardTitle = {
  color: "#ffffff",
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: "600",
  margin: "0 0 10px",
  height: "44px",
};

const cardValue = {
  color: "#ffffff",
  fontSize: "24px",
  lineHeight: "30px",
  fontWeight: "700",
  margin: "0 0 8px",
};

const cardSub = {
  fontSize: "13px",
  lineHeight: "18px",
  margin: 0,
  height: "36px",
};

const ctaBox = {
  backgroundColor: "#2a1f22",
  borderRadius: "14px",
  padding: "28px 20px",
  textAlign: "center" as const,
  margin: "12px 0 28px",
};

const ctaText = {
  color: "#ffffff",
  fontSize: "15px",
  lineHeight: "24px",
  fontWeight: "600",
  margin: "0 0 22px",
};

const button = {
  display: "inline-block",
  backgroundColor: "#000000",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "20px",
  fontWeight: "700",
  lineHeight: "24px",
  borderRadius: "10px",
  padding: "16px 28px",
  border: "1px solid #1f1f1f",
};

const smallMuted = {
  color: "#d0c9c9",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "18px 0 0",
};
