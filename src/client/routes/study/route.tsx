import { getQueryClient } from "@/client/lib/query-client";
import { passageQueries } from "@/client/features/passage";
import { StudyWorkspace } from "./study-workspace";

export { DashboardError as ErrorBoundary } from "@/client/components/layout/dashboard-error";

// ensureQueryData (unlike prefetchQuery) throws, so a failed load renders the
// ErrorBoundary instead of an empty workspace.
export async function clientLoader() {
  await getQueryClient().ensureQueryData(passageQueries.list());
  return null;
}

export default function StudyRoute() {
  return <StudyWorkspace />;
}
