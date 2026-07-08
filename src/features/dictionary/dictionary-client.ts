"use client";

import * as Sentry from "@sentry/nextjs";
import {
  dictionarySuggestResponseSchema,
  dictionaryEntryDetailResponseSchema,
} from "@/features/dictionary/schemas/dictionary.schema";

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

  return parsed.data;
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

  return parsed.data;
}

