import "server-only";
import prisma from "@/lib/prisma";
import type {
  VocabularyInputParsed,
  VocabularyItem,
} from "@/features/vocabulary/schema";

/**
 * Persist a vocabulary item for a user.
 *
 * Re-saving the same (userId, term, translation) tuple increments `savedCount`
 * and refreshes the mutable fields (partofSpeech). A different translation
 * of the same word creates a separate row — that's intentional, since a
 * learner may want to track multiple meanings.
 *
 * `upsert` is safe here because the model's
 * `@@unique([userId, term, translation])` matches the composite key.
 */
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

/**
 * List every vocabulary item the user has saved, newest first.
 *
 * Returns the full row (matching the `VocabularyItem` schema) so the
 * vocabulary page can render every column without a follow-up fetch.
 */
export async function listVocabularyItemsForUser(
  userId: string,
): Promise<VocabularyItem[]> {
  return prisma.vocabularyItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}