import "server-only";
import prisma from "@/lib/prisma";
import { NotFoundError } from "@/lib/error/app-error";
import type {
  VocabularyInputParsed,
  VocabularyItem,
  VocabularyStats,
  VocabularyUpdateInput,
} from "@/features/vocabulary/schema";

export async function storeVocabularyItemForUser(
  userId: string,
  input: VocabularyInputParsed,
) {
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
      updatedAt: new Date(),
    },
    update: {
      partofSpeech: input.partofSpeech,
      savedCount: { increment: 1 },
      updatedAt: new Date(),
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
  if (!existing) throw new NotFoundError("VocabularyItem", id);
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
  if (!existing) throw new NotFoundError("VocabularyItem", id);
  return prisma.vocabularyItem.update({
    where: { id },
    data: {
      term: input.term,
      translation: input.translation,
      partofSpeech: input.partofSpeech,
      learningstatus: input.learningstatus,
      updatedAt: new Date(),
    },
  });
}

export async function listVocabularyStatsForUser(
  userId: string,
): Promise<VocabularyStats> {
  const groups = await prisma.vocabularyItem.groupBy({
    by: ["learningstatus"],
    where: { userId },
    _count: { _all: true },
  });

  const buckets = { NEW: 0, LEARNING: 0, MEMORIZED: 0 };
  for (const g of groups) buckets[g.learningstatus] = g._count._all;

  return {
    total: buckets.NEW + buckets.LEARNING + buckets.MEMORIZED,
    new: buckets.NEW,
    learning: buckets.LEARNING,
    known: buckets.MEMORIZED,
  };
}