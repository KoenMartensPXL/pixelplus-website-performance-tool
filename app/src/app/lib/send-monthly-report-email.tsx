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

function formatMonthNL(monthInput: string | Date) {
  const d =
    monthInput instanceof Date
      ? monthInput
      : /^\d{4}-\d{2}$/.test(monthInput)
        ? new Date(`${monthInput}-01`)
        : /^\d{4}-\d{2}-\d{2}$/.test(monthInput)
          ? new Date(monthInput)
          : null;

  if (!d || Number.isNaN(d.getTime())) {
    throw new Error(`Invalid monthStr: ${String(monthInput)}`);
  }

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

  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export type SendMonthlyReportEmailArgs = {
  to: string;
  bcc?: string | null;
  customerName: string;
  monthStr: string;
  reportUrl: string;
  summary: Summary;
  comparison: Comparison;
};

type CommApiPayload = {
  apiKey: string;
  base64: 1;
  type: "send";
  from: string;
  fromName: string;
  to: string;
  subject: string;
  message: string;
  bcc?: string;
};

export async function sendMonthlyReportEmail({
  to,
  bcc,
  customerName,
  monthStr,
  reportUrl,
  summary,
  comparison,
}: SendMonthlyReportEmailArgs) {
  const apiUrl = "http://comm.pixelplus.nl/api/v2/";
  const apiKey = mustEnv("COMM_API_KEY");
  const from = "no-reply@pixelplus.nl";
  const fromName = "Pixelplus";

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

  const payload: CommApiPayload = {
    apiKey,
    base64: 1,
    type: "send",
    from,
    fromName,
    to,
    subject,
    message: Buffer.from(html, "utf-8").toString("base64"),
    ...(bcc ? { bcc } : {}),
  };

  console.log("[sendMonthlyReportEmail] apiUrl:", apiUrl);
  console.log("[sendMonthlyReportEmail] payload keys:", Object.keys(payload));
  console.log("[sendMonthlyReportEmail] payload preview:", {
    apiKey: "[REDACTED]",
    base64: payload.base64,
    type: payload.type,
    from: payload.from,
    fromName: payload.fromName,
    to: payload.to,
    bcc: payload.bcc,
    subject: payload.subject,
    messageLength: payload.message.length,
  });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const rawBody = await response.text();

  console.log("[sendMonthlyReportEmail] response status:", response.status);
  console.log("[sendMonthlyReportEmail] response ok:", response.ok);
  console.log("[sendMonthlyReportEmail] response body:", rawBody);

  let parsedBody: unknown = rawBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {}

  if (!response.ok) {
    throw new Error(
      `COMM API request failed with status ${response.status}: ${rawBody}`,
    );
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsedBody,
    sentPayloadKeys: Object.keys(payload),
  };
}
