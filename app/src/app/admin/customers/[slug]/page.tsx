import { redirect, notFound } from "next/navigation";
import { isAdminLoggedIn } from "@/app/lib/auth";
import {
  getCustomerBySlug,
  getLatestReportForCustomer,
} from "@/app/lib/dashboard";
import DashboardView from "@/app/components/dashboard-view";
import BrandFooter from "@/app/components/brand/brand-footer";
import SendReportButton from "@/app/components/admin/send-report-button";

function serializeForClient<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const loggedIn = await isAdminLoggedIn();

  if (!loggedIn) {
    redirect("/login");
  }

  const { slug } = await params;

  const customer = await getCustomerBySlug(slug);

  if (!customer) {
    notFound();
  }

  const report = await getLatestReportForCustomer(customer.id);

  const safeCustomer = serializeForClient(customer);
  const safeReport = serializeForClient(report);

  return (
    <>
      <DashboardView
        customer={safeCustomer}
        report={safeReport}
        isAdmin={true}
        months={[]}
        series={[]}
        token=""
      />
      <BrandFooter />
    </>
  );
}
