import { VocabularyPageClient } from "@/features/vocabulary/component/vocabulary-page";

export const dynamic = "force-dynamic";

export default function VocabularyPage() {
  return (
    <VocabularyPageClient
      initialList={[]}
      initialTotal={0}
      initialStats={{ total: 0, new: 0, learning: 0, known: 0 }}
      initialSets={[]}
    />
  );
}
