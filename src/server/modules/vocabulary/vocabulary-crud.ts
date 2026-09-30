import prisma, { isUniqueViolation } from "@/server/lib/prisma";
import { AppError } from "@/server/lib/errors";
import type { VocabularyStatus } from "@/shared/enums";
import type {
  VocabularyInputParsed,
  VocabularyItem,
  VocabularyStats,
  VocabularyStatusCounts,
  VocabularyUpdateInput,
} from "@/shared/vocabulary/schema";

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

export async function storeVocabularyItemForUser(
  userId: string,
  input: VocabularyInputParsed,
) {
  if (input.passageId) {
    const passage = await prisma.passage.findFirst({
      where: { id: input.passageId, userId },
      select: { id: true },
    });
    if (!passage) throw new AppError("passage.not_found", "Passage not found", { id: input.passageId });
  }

  return prisma.vocabularyItem.upsert({
    where: {
      userId_term_translation: {
        userId,
        term: input.term,
        translation: input.translation,
      },
    },
    create: {
      userId,
      term: input.term,
      translation: input.translation,
      sourceLanguage: input.sourceLanguage,
      targetLanguage: input.targetLanguage,
      partofSpeech: input.partofSpeech,
      contextSentence: input.contextSentence,
      passageId: input.passageId,
    },
    // A repeat save keeps the first context: the card shows where the word was first met.
    update: {
      partofSpeech: input.partofSpeech,
      savedCount: { increment: 1 },
    },
  });
}

export async function listVocabularyItemsForUser(
  userId: string,
): Promise<VocabularyItem[]> {
  return prisma.vocabularyItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteVocabularyItemForUser(
  userId: string,
  id: string,
): Promise<void> {
  const existing = await prisma.vocabularyItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new AppError("vocabulary.not_found", "VocabularyItem not found", { id: id });
  await prisma.vocabularyItem.delete({ where: { id } });
}

export async function updateVocabularyItemForUser(
  userId: string,
  id: string,
  input: VocabularyUpdateInput,
): Promise<VocabularyItem> {
  const existing = await prisma.vocabularyItem.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) throw new AppError("vocabulary.not_found", "VocabularyItem not found", { id: id });
  try {
    return await prisma.vocabularyItem.update({
      where: { id },
      data: {
        term: input.term,
        translation: input.translation,
        partofSpeech: input.partofSpeech,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("vocabulary.duplicate", "Term and translation already saved", { id });
    }
    throw error;
  }
}

export async function listVocabularyStatsForUser(
  userId: string,
): Promise<VocabularyStats> {
  const groups = await prisma.vocabularyItem.groupBy({
    by: ["status"],
    where: { userId },
    _count: { _all: true },
  });

  const counts = toStatusCounts(groups.map((g) => ({ status: g.status, count: g._count._all })));

  return {
    ...counts,
    total: counts.new + counts.learning + counts.review + counts.relearning,
  };
}
