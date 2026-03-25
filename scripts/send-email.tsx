import "dotenv/config";
import Mailgun from "mailgun.js";
import FormData from "form-data";
import { render } from "@react-email/render";
import MonthlyReportEmail from "../app/emails/monthly-email-template";

function mustEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

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

type SendMonthlyReportEmailArgs = {
  to: string;
  customerName: string;
  monthStr: string;
  reportUrl: string;
  summary: Summary;
  comparison: Comparison;
};

export async function sendMonthlyReportEmail({
  to,
  customerName,
  monthStr,
  reportUrl,
  summary,
  comparison,
}: SendMonthlyReportEmailArgs) {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: mustEnv("MAILGUN_API_KEY"),
  });

  const subject = `Pixelplus rapport – ${formatMonthNL(monthStr)} – ${customerName}`;

  const html = await render(
    <MonthlyReportEmail
      customerName={customerName}
      monthStr={monthStr}
      reportUrl={reportUrl}
      summary={summary}
      comparison={comparison}
    />,
  );

  return mg.messages.create(mustEnv("MAILGUN_DOMAIN"), {
    from: mustEnv("MAILGUN_FROM_EMAIL"),
    to: [to],
    subject,
    html,
    text: `Rapport ${formatMonthNL(monthStr)} voor ${customerName}: ${reportUrl}`,
  });
}
