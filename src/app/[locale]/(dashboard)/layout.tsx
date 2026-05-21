import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { getCurrentUser } from "@/lib/auth/auth-utils";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <DashboardSidebar
      user={{
        name: user?.name ?? null,
        email: user?.email ?? null,
      }}
    >
      {children}
    </DashboardSidebar>
  );
}
