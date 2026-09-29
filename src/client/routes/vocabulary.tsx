import { getQueryClient } from "@/client/lib/query-client";
import { vocabularyQueries, VocabularyPageClient } from "@/client/features/vocabulary";

export { DashboardError as ErrorBoundary } from "@/client/components/layout/dashboard-error";

export async function clientLoader() {
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(vocabularyQueries.list()),
    queryClient.prefetchQuery(vocabularyQueries.stats()),
  ]);
  return null;
}

export default function VocabularyRoute() {
  return <VocabularyPageClient />;
}
