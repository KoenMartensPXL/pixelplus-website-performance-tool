import "dotenv/config";
import { resendLatestReportForCustomer } from "../app/src/app/lib/admin-report";

async function main() {
  const slug = process.env.CUSTOMER_SLUG;

  if (!slug) {
    throw new Error("Missing CUSTOMER_SLUG");
  }

  const result = await resendLatestReportForCustomer(slug);

  console.log("Performance mail verstuurd voor klant:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
