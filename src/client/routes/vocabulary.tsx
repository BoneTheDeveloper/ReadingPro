import { getQueryClient } from "@/client/lib/query-client";
import { vocabularyQueries, vocabularySetQueries, VocabularyPageClient } from "@/client/features/vocabulary";

export { DashboardError as ErrorBoundary } from "@/client/components/layout/dashboard-error";

// ensureQueryData (unlike prefetchQuery) throws, so a failed load renders the
// ErrorBoundary instead of an empty word list.
export async function clientLoader() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.ensureQueryData(vocabularyQueries.list()),
    queryClient.ensureQueryData(vocabularyQueries.stats()),
    queryClient.ensureQueryData(vocabularySetQueries.list()),
  ]);
  return null;
}

export default function VocabularyRoute() {
  return <VocabularyPageClient />;
}
