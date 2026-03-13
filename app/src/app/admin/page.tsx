import { redirect } from "next/navigation";
import { isAdminLoggedIn } from "@/app/lib/auth";
import { getAllCustomers } from "@/app/lib/dashboard";
import AdminCustomersPage from "@/app/components/admin/admin-customers-page";

export default async function AdminPage() {
  const loggedIn = await isAdminLoggedIn();

  if (!loggedIn) {
    redirect("/login");
  }

  const customers = await getAllCustomers();

  return <AdminCustomersPage initialCustomers={customers} />;
}
