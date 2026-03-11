require("dotenv").config({ path: "./app/.env" });

const FormData = require("form-data");
const Mailgun = require("mailgun.js");

function mustEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }

  return value;
}

async function sendSimpleMessageTemplate() {
  const mailgun = new Mailgun(FormData);

  const mg = mailgun.client({
    username: "api",
    key: mustEnv("MAILGUN_API_KEY"),
    url: process.env.MAILGUN_API_BASE_URL || "https://api.mailgun.net",
  });

  try {
    const data = await mg.messages.create(mustEnv("MAILGUN_DOMAIN"), {
      from: mustEnv("MAILGUN_FROM_EMAIL"),

      to: ["Koen Martens <koen@family-martens.com>"],

      subject: "Pixelplus rapport test",

      template: "pixelplus-monthly-report",

      "h:X-Mailgun-Variables": JSON.stringify({
        customer_name: "Koen Martens",
        month_label: "mei 2026",
        report_url: "http://localhost:3000/test-token",

        new_users: "124",
        new_users_delta: "+12%",
        new_users_color: "#7CFFB2",

        conversions: "8",
        conversions_delta: "-4%",
        conversions_color: "#FF6B6B",

        organic_clicks: "57",
        organic_clicks_delta: "+9%",
        organic_clicks_color: "#7CFFB2",

        missed_opportunity: "312",
        missed_opportunity_delta: "+6%",
        missed_opportunity_color: "#cfcfcf",

        hook_text:
          "We zien <b style='color:#fff;'>312</b> Google-vertoningen zonder klik — er zit dus nog extra groei in.",

        year: new Date().getFullYear(),
      }),
    });

    console.log("Mail succesvol verstuurd:");
    console.log(data);
  } catch (error) {
    console.error("Fout bij verzenden:");
    console.error(error);
  }
}

sendSimpleMessageTemplate();
