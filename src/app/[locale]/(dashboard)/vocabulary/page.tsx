import { auth } from "@clerk/nextjs/server";
import { VocabularyPageClient } from "@/features/vocabulary/ui/vocabulary-page-client";
import { getVocabularyItemList, getVocabularyItemStats } from "@/features/vocabulary/services/vocabulary-items.service";
import { getVocabularySetList } from "@/features/vocabulary/services/vocabulary-sets.service";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  // Authoritative auth gate — redirects to sign-in if unauthenticated.
  // Not delegated to middleware alone (optimistic only; cf. CVE-2025-29927).
  const { userId } = await auth.protect();

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
