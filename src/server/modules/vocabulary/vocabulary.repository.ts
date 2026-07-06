import "server-only";
import { upsertVocabularyItem } from "@/server/db/vocabulary/vocabulary-queries";
import { getOwnedTranslationSource } from "@/server/db/translation-queries";
import type { SaveVocabularyItemInput } from "./vocabulary.service";

export async function findOwnedTranslationSource(
  userId: string,
  sourceId: string,
) {
  return getOwnedTranslationSource(userId, sourceId);
}

export async function saveVocabularyItemRow(input: SaveVocabularyItemInput) {
  return upsertVocabularyItem(input);
}
