"use server";

import { getUserId } from "@/lib/auth/auth-server";
import { suggestDictionaryTerms } from "./services/suggest.service";
import { getDictionaryEntryDetail } from "./services/entry-detail.service";
import {
  suggestInputSchema,
  entryDetailInputSchema,
} from "./schemas/dictionary.schema";
import type {
  DictionaryEntryDto,
  DictionarySenseDto,
  DictionarySuggestItemDto,
} from "./schemas/dictionary.schema";

/**
 * Server Action powering the as-you-type dictionary search box.
 * Returns ranked suggestion items for a partial query.
 */
export async function suggestDictionaryTermsAction(
  query: string,
  sourceLanguage = "en",
  targetLanguage = "vi",
): Promise<DictionarySuggestItemDto[]> {
  const parsed = suggestInputSchema.parse({
    query,
    sourceLanguage,
    targetLanguage,
  });

  await getUserId();

  return suggestDictionaryTerms(parsed.query, {
    sourceLanguage: parsed.sourceLanguage,
    targetLanguage: parsed.targetLanguage,
  });
}

/**
 * Server Action powering full-entry load when a suggestion is clicked.
 * Returns the entry DTO, or null when the entry id is unknown.
 */
export async function getDictionaryEntryDetailAction(
  entryId: string,
  sourceLanguage = "en",
  targetLanguage = "vi",
): Promise<DictionaryEntryDto | null> {
  const parsed = entryDetailInputSchema.parse({
    entryId,
    sourceLanguage,
    targetLanguage,
  });

  await getUserId();

  return getDictionaryEntryDetail(parsed.entryId, {
    sourceLanguage: parsed.sourceLanguage,
    targetLanguage: parsed.targetLanguage,
  });
}

/**
 * Bridge action: dictionary feature saves vocabulary through vocabulary feature.
 * This keeps the boundary clean - hooks only call their own feature's actions.
 */
export async function saveDictionarySenseToVocabularyAction(
  entry: DictionaryEntryDto,
  sense: DictionarySenseDto,
) {
  const primary =
    sense.translations.find((t) => t.isPrimary) ?? sense.translations[0];
  if (!primary) {
    throw new Error("No primary translation found for sense");
  }

  const { saveVocabularyAction } = await import("@/features/vocabulary/action");
  return saveVocabularyAction({
    selectedText: entry.headword,
    translation: primary.translation,
    contextSentence: sense.example ?? undefined,
    sourceLanguage: "en",
    targetLanguage: "vi",
    source: "DICTIONARY",
    dictionaryEntryId: entry.id,
    dictionarySenseId: sense.id,
  });
}
