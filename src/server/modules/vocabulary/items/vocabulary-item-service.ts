import { isUniqueViolation } from "@/server/lib/db";
import { AppError } from "@/server/lib/errors";
import type {
  VocabularyInputParsed,
  VocabularyItem,
  VocabularyStats,
  VocabularyUpdateInput,
} from "@/shared/vocabulary/schema";
import { requireOwnedPassage } from "@/server/modules/passage";
import { ensureDefaultSetForUser } from "../default-vocabulary-set";
import { toStatusCounts } from "../status-counts";
import {
  countVocabularyItemsByStatus,
  deleteVocabularyItem,
  listVocabularyItemsForUser as listItemRows,
  updateVocabularyItem,
  upsertVocabularyItem,
  type VocabularyItemRow,
} from "./vocabulary-item-repository";

export async function storeVocabularyItemForUser(
  userId: string,
  input: VocabularyInputParsed,
): Promise<VocabularyItemRow> {
  if (input.passageId) await requireOwnedPassage(userId, input.passageId);

  const vocabularySetId = await ensureDefaultSetForUser(userId);

  return upsertVocabularyItem({
    userId,
    term: input.term,
    translation: input.translation,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    partofSpeech: input.partofSpeech,
    contextSentence: input.contextSentence ?? null,
    passageId: input.passageId ?? null,
    vocabularySetId,
  });
}

export async function listVocabularyItemsForUser(userId: string): Promise<VocabularyItem[]> {
  return listItemRows(userId);
}

export async function deleteVocabularyItemForUser(userId: string, id: string): Promise<void> {
  const deleted = await deleteVocabularyItem(userId, id);
  if (!deleted) throw new AppError("vocabulary.not_found", "VocabularyItem not found", { id });
}

export async function updateVocabularyItemForUser(
  userId: string,
  id: string,
  input: VocabularyUpdateInput,
): Promise<VocabularyItem> {
  let updated: VocabularyItemRow | null;
  try {
    updated = await updateVocabularyItem(userId, id, {
      term: input.term,
      translation: input.translation,
      partofSpeech: input.partofSpeech,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("vocabulary.duplicate", "Term and translation already saved", { id });
    }
    throw error;
  }
  if (!updated) throw new AppError("vocabulary.not_found", "VocabularyItem not found", { id });
  return updated;
}

export async function listVocabularyStatsForUser(userId: string): Promise<VocabularyStats> {
  const counts = toStatusCounts(await countVocabularyItemsByStatus(userId));

  return {
    ...counts,
    total: counts.new + counts.learning + counts.review + counts.relearning,
  };
}
