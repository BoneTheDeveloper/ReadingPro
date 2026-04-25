import { requirePageSession } from "@/lib/auth/session";
import { DashboardSidebar } from "@/component/layout/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requirePageSession();

  return <DashboardSidebar user={session.user}>{children}</DashboardSidebar>;
}
