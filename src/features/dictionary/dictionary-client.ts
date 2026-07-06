"use client";

import * as Sentry from "@sentry/nextjs";
import { postJson } from "@/lib/http/api-request";
import {
  dictionarySuggestResponseSchema,
  dictionaryEntryDetailResponseSchema,
  type DictionaryEntryDto,
  type DictionarySenseDto,
} from "@/features/dictionary/schemas/dictionary-response.schema";
import { vocabularyItemResponseSchema } from "@/features/vocabulary/model/vocabulary-response.schema";

/**
 * Fetch suggestions for a dictionary search query.
 */
export async function getDictionarySuggestions(
  query: string,
  sourceLanguage = "en",
  targetLanguage = "vi",
) {
  const params = new URLSearchParams({
    q: query,
    sourceLanguage,
    targetLanguage,
  });
  const res = await fetch(`/api/dictionary/suggest?${params}`);
  const json: unknown = await res.json();
  const parsed = dictionarySuggestResponseSchema.safeParse(json);

  if (!parsed.success || "error" in parsed.data) {
    Sentry.addBreadcrumb({
      category: "dictionary",
      level: "error",
      message: "dictionary-suggest-schema-error",
      data: { route: "/api/dictionary/suggest" },
    });
    throw new Error("Failed to parse dictionary suggestions");
  }

  return parsed.data.data;
}

/**
 * Fetch detailed information for a specific dictionary entry.
 */
export async function getDictionaryEntryDetail(
  entryId: string,
  sourceLanguage = "en",
  targetLanguage = "vi",
) {
  const params = new URLSearchParams({
    sourceLanguage,
    targetLanguage,
  });
  const res = await fetch(`/api/dictionary/entries/${entryId}?${params}`);

  if (!res.ok) {
    throw new Error(`Entry not found: ${entryId}`);
  }

  const json: unknown = await res.json();
  const parsed = dictionaryEntryDetailResponseSchema.safeParse(json);

  if (!parsed.success || "error" in parsed.data) {
    Sentry.addBreadcrumb({
      category: "dictionary",
      level: "error",
      message: "dictionary-entry-detail-schema-error",
      data: { route: "/api/dictionary/entries/:entryId" },
    });
    throw new Error("Failed to parse dictionary entry detail");
  }

  return parsed.data.data;
}

/**
 * Save a dictionary sense to the vocabulary system.
 */
export async function saveDictionaryVocabulary(
  entry: DictionaryEntryDto,
  sense: DictionarySenseDto,
) {
  const primary =
    sense.translations.find((t) => t.isPrimary) ?? sense.translations[0];
  if (!primary) {
    throw new Error("No primary translation found for sense");
  }

  const payload = {
    selectedText: entry.headword,
    translation: primary.translation,
    contextSentence: sense.example ?? undefined,
    sourceLanguage: "en" as const,
    targetLanguage: "vi" as const,
    source: "DICTIONARY" as const,
    dictionaryEntryId: entry.id,
    dictionarySenseId: sense.id,
  };

  const result = await postJson(
    "/api/vocabulary",
    payload,
    vocabularyItemResponseSchema,
  );
  if ("error" in result) {
    throw new Error(result.error);
  }
  return result.data;
}
