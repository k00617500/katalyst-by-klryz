import { verifyAdminSession } from "@/lib/auth/dal";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  await verifyAdminSession();

  return <AdminShell>{children}</AdminShell>;
}
