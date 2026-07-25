import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return <DashboardSidebar user={session.user}>{children}</DashboardSidebar>;
}