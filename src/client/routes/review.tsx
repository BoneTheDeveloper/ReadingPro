import { useSearchParams, type ClientLoaderFunctionArgs } from "react-router";
import { getQueryClient } from "@/client/lib/query-client";
import { reviewQueries, ReviewPageClient } from "@/client/features/vocabulary";

export { DashboardError as ErrorBoundary } from "@/client/components/layout/dashboard-error";

const SET_PARAM = "setId";

// ensureQueryData (unlike prefetchQuery) throws, so an unknown set renders the
// ErrorBoundary instead of an empty review screen.
export async function clientLoader({ request }: ClientLoaderFunctionArgs) {
  const setId = new URL(request.url).searchParams.get(SET_PARAM) ?? undefined;
  await getQueryClient().ensureQueryData(reviewQueries.due(setId));
  return null;
}

export default function ReviewRoute() {
  const [searchParams] = useSearchParams();
  const setId = searchParams.get(SET_PARAM) ?? undefined;
  return <ReviewPageClient key={setId ?? "all"} setId={setId} />;
}
