import "server-only";
import prisma from "@/lib/prisma";
import type {
  VocabularyInputParsed,
  VocabularyItem,
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
