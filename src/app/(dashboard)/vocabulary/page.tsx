import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { requirePageSession } from "@/lib/auth/session";
import { getQueryClient } from "@/lib/query-client";
import {
  listVocabularyItemsForUser,
  listVocabularyStatsForUser,
} from "@/features/vocabulary/server/services/vocabulary-crud";
import { vocabularyQueries } from "@/features/vocabulary/api/queries";
import { VocabularyPageClient } from "@/features/vocabulary/component/vocabulary-page";

export default async function VocabularyPage() {
  const { user } = await requirePageSession();
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({
      ...vocabularyQueries.list(),
      queryFn: (): Promise<Awaited<ReturnType<typeof listVocabularyItemsForUser>>> =>
        listVocabularyItemsForUser(user.id),
    }),
    queryClient.prefetchQuery({
      ...vocabularyQueries.stats(),
      queryFn: (): Promise<Awaited<ReturnType<typeof listVocabularyStatsForUser>>> =>
        listVocabularyStatsForUser(user.id),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <VocabularyPageClient />
    </HydrationBoundary>
  );
}