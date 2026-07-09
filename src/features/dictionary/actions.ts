"use server";

import { z } from "zod";
import { getUserId } from "@/lib/auth-server";
import { suggestDictionaryTerms } from "./services/suggest-service";
import { getDictionaryEntryDetail } from "./services/entry-detail-service";
import type {
  DictionaryEntryDto,
  DictionarySuggestItemDto,
} from "./schemas/dictionary.schema";

const suggestInputSchema = z.object({
  query: z.string().trim().min(1).max(200),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

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

const entryDetailInputSchema = z.object({
  entryId: z.string().uuid(),
  sourceLanguage: z.literal("en"),
  targetLanguage: z.literal("vi"),
});

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
