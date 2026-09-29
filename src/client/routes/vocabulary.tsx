import { getQueryClient } from "@/client/lib/query-client";
import { vocabularyQueries } from "@/client/features/vocabulary/api/queries";
import { VocabularyPageClient } from "@/client/features/vocabulary/component/vocabulary-page";

export { DashboardError as ErrorBoundary } from "@/client/component/layout/dashboard-error";

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
