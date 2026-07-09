import { getUserId } from "@/lib/auth-server";
import { getUserProgress } from "@/features/progress/db/progress-queries";
import { ProgressDashboard } from "@/features/progress/ui/progress-dashboard";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const userId = await getUserId();
  const stats = await getUserProgress(userId);

  return <ProgressDashboard initialStats={stats} />;
}
