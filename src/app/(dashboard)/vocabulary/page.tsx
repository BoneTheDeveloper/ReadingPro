import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { VocabularyPageClient } from "@/features/vocabulary/components/vocabulary-page";
import {
  getVocabularyItemList,
  getVocabularyItemStats,
} from "@/features/vocabulary/server/services/vocabulary-items";
import { getVocabularySetList } from "@/features/vocabulary/server/services/vocabulary-sets";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const [list, stats, sets] = await Promise.all([
    getVocabularyItemList({ userId: session.user.id, page: 1, pageSize: 20 }),
    getVocabularyItemStats(session.user.id),
    getVocabularySetList({ userId: session.user.id }),
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