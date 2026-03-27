import { notFound } from "next/navigation";
import {
  getLatestReportForCustomer,
  getTokenCustomerBySlugAndToken,
} from "@/app/lib/dashboard";
import DashboardView from "@/app/components/customer-dashboard-view";

function serializeForClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export default async function CustomerMagicLinkPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  const customer = await getTokenCustomerBySlugAndToken(slug, token);

  if (!customer) {
    notFound();
  }

  const report = await getLatestReportForCustomer(customer.id);

  const safeCustomer = serializeForClient(customer);
  const safeReport = serializeForClient(report);

  return <DashboardView customer={safeCustomer} report={safeReport} />;
}
