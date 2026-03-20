import "dotenv/config";
import { sendLatestReportsForEnabledCustomers } from "../app/src/app/lib/admin-report";

async function main() {
  const result = await sendLatestReportsForEnabledCustomers();

  console.log("Maandelijkse rapport-mail run voltooid:");
  console.log(JSON.stringify(result, null, 2));

  if (result.failureCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
