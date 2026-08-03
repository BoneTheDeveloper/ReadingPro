import { requirePageSession } from "@/lib/auth/session";
import { listVocabularyItemsForUser } from "@/features/vocabulary/server/services/vocabulary-crud";
import { VocabularyPageClient } from "@/features/vocabulary/component/vocabulary-page";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const { user } = await requirePageSession();
  const items = await listVocabularyItemsForUser(user.id);

  return (
    <VocabularyPageClient
      initialList={items}
      initialTotal={items.length}
      initialStats={{ total: 0, new: 0, learning: 0, known: 0 }}
      initialSets={[]}
    />
  );
}
