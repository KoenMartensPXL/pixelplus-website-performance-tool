import Mailgun from "mailgun.js";
import FormData from "form-data";
import { render } from "@react-email/render";
import MonthlyReportEmail, {
  type Summary,
  type Comparison,
} from "../../../emails/monthly-email-template";

function mustEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
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

export type SendMonthlyReportEmailArgs = {
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

  const clientConfig: any = {
    username: "api",
    key: mustEnv("MAILGUN_API_KEY"),
  };

  const apiBaseUrl = process.env.MAILGUN_API_BASE_URL;
  if (apiBaseUrl) {
    clientConfig.url = apiBaseUrl;
  }

  const mg = mailgun.client(clientConfig);

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
