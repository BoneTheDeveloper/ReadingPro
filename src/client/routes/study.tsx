import { getQueryClient } from "@/client/lib/query-client";
import { passageQueries } from "@/client/features/passage/api/queries";
import { StudyWorkspace } from "@/client/features/studio/component/study-workspace";

export { DashboardError as ErrorBoundary } from "@/client/component/layout/dashboard-error";

export async function clientLoader() {
  await getQueryClient().prefetchQuery(passageQueries.list());
  return null;
}

export default function StudyRoute() {
  return <StudyWorkspace />;
}
