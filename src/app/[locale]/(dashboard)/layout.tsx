import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { LearningSessionTracker } from "@/features/learning-session/ui/learning-session-tracker";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardSidebar>
      <LearningSessionTracker />
      {children}
    </DashboardSidebar>
  );
}
