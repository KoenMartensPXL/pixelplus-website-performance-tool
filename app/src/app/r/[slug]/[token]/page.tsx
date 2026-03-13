import { notFound } from "next/navigation";
import {
  getLatestReportForCustomer,
  getTokenCustomerBySlugAndToken,
} from "@/app/lib/dashboard";
import DashboardView from "@/app/components/dashboard-view";

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

  return (
    <DashboardView
      customer={customer}
      report={report}
      months={[]}
      series={[]}
      token={token}
    />
  );
}
