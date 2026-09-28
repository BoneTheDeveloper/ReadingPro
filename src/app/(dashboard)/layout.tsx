import { requirePageSession } from "@/lib/auth/page-session";
import { StoreProvider } from "@/lib/store/store-provider";
import { DashboardSidebar } from "@/component/layout/dashboard-sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requirePageSession();

  return (
    // Only plain fields go into the store; the session's Date fields would
    // trip Redux's serializability check.
    <StoreProvider
      user={{ name: user.name, email: user.email, image: user.image }}
    >
      <DashboardSidebar>{children}</DashboardSidebar>
    </StoreProvider>
  );
}
