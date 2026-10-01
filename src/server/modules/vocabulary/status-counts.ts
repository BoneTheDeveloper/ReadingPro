import type { VocabularyStatus } from "@/shared/enums";
import type { VocabularyStatusCounts } from "@/shared/vocabulary/schema";

const COUNT_KEY = {
  NEW: "new",
  LEARNING: "learning",
  REVIEW: "review",
  RELEARNING: "relearning",
} as const satisfies Record<VocabularyStatus, keyof VocabularyStatusCounts>;

export function toStatusCounts(
  groups: Array<{ status: VocabularyStatus; count: number }>,
): VocabularyStatusCounts {
  const counts: VocabularyStatusCounts = { new: 0, learning: 0, review: 0, relearning: 0 };
  for (const g of groups) counts[COUNT_KEY[g.status]] = g.count;
  return counts;
}
