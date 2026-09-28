import { getQueryClient } from "@/lib/query-client";
import { vocabularyQueries } from "@/features/vocabulary/api/queries";
import { VocabularyPageClient } from "@/features/vocabulary/component/vocabulary-page";

export { DashboardError as ErrorBoundary } from "@/component/layout/dashboard-error";

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
