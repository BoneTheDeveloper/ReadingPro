import { getUserId } from "@/lib/auth/auth-server";
import { VocabularyPageClient } from "@/features/vocabulary/components/vocabulary-page";
import {
  getVocabularyItemList,
  getVocabularyItemStats,
} from "@/features/vocabulary/server/services/vocabulary-items";
import { getVocabularySetList } from "@/features/vocabulary/server/services/vocabulary-sets";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  // Auth gate - middleware handles redirect, but we verify userId exists
  const userId = await getUserId();

  const [list, stats, sets] = await Promise.all([
    getVocabularyItemList({ userId, page: 1, pageSize: 20 }),
    getVocabularyItemStats(userId),
    getVocabularySetList({ userId }),
  ]);

  return (
    <VocabularyPageClient
      initialList={list.items}
      initialTotal={list.total}
      initialStats={stats}
      initialSets={sets}
    />
  );
}
