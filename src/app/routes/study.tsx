import { getQueryClient } from "@/lib/query-client";
import { passageQueries } from "@/features/passage/api/queries";
import { StudyWorkspace } from "@/features/studio/component/study-workspace";

export { DashboardError as ErrorBoundary } from "@/component/layout/dashboard-error";

export async function clientLoader() {
  await getQueryClient().prefetchQuery(passageQueries.list());
  return null;
}

export default function StudyRoute() {
  return <StudyWorkspace />;
}
