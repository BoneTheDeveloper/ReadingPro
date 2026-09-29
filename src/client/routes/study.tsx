import { getQueryClient } from "@/client/lib/query-client";
import { passageQueries } from "@/client/features/passage";
import { StudyWorkspace } from "@/client/features/studio";

export { DashboardError as ErrorBoundary } from "@/client/components/layout/dashboard-error";

export async function clientLoader() {
  await getQueryClient().prefetchQuery(passageQueries.list());
  return null;
}

export default function StudyRoute() {
  return <StudyWorkspace />;
}
