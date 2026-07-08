"use client";

import { useCallback, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { saveVocabularyAction } from "@/features/vocabulary/actions";
import type {
  DictionaryEntryDto,
  DictionarySenseDto,
} from "@/features/dictionary/schemas/dictionary.schema";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Hook to save a dictionary sense to the vocabulary system.
 * Tracks saved state per (entryId, senseId) pair to prevent duplicates.
 */
export function useSaveDictionaryVocabulary() {
  const [savedSenses, setSavedSenses] = useState<Set<string>>(new Set());
  const [savingSenseId, setSavingSenseId] = useState<string | null>(null);
  const [errorSenseId, setErrorSenseId] = useState<string | null>(null);
  const pendingRef = useRef(false);

  const buildKey = (entryId: string, senseId: string) =>
    `${entryId}:${senseId}`;

  const saveSense = useCallback(
    async (entry: DictionaryEntryDto, sense: DictionarySenseDto) => {
      const key = buildKey(entry.id, sense.id);

      if (savedSenses.has(key) || pendingRef.current) return;

      pendingRef.current = true;
      setSavingSenseId(sense.id);
      setErrorSenseId(null);

      try {
        Sentry.addBreadcrumb({
          category: "dictionary-vocabulary",
          level: "info",
          message: "dictionary-vocabulary-save-click",
          data: { entryId: entry.id, senseId: sense.id },
        });

        const primary =
          sense.translations.find((t) => t.isPrimary) ?? sense.translations[0];
        if (!primary) {
          throw new Error("No primary translation found for sense");
        }

        const result = await saveVocabularyAction({
          selectedText: entry.headword,
          translation: primary.translation,
          contextSentence: sense.example ?? undefined,
          sourceLanguage: "en",
          targetLanguage: "vi",
          source: "DICTIONARY",
          dictionaryEntryId: entry.id,
          dictionarySenseId: sense.id,
        });

        if (!result.success) throw new Error("Failed to save");

        setSavedSenses((prev) => new Set(prev).add(key));
        Sentry.addBreadcrumb({
          category: "dictionary-vocabulary",
          level: "info",
          message: "dictionary-vocabulary-save-success",
          data: { vocabularyItemId: result.data.id },
        });
      } catch {
        Sentry.addBreadcrumb({
          category: "dictionary-vocabulary",
          level: "error",
          message: "dictionary-vocabulary-save-error",
        });
        setErrorSenseId(sense.id);
      } finally {
        setSavingSenseId(null);
        pendingRef.current = false;
      }
    },
    [savedSenses],
  );

  const getStatus = useCallback(
    (entryId: string, senseId: string): SaveStatus => {
      const key = buildKey(entryId, senseId);
      if (savedSenses.has(key)) return "saved";
      if (savingSenseId === senseId) return "saving";
      if (errorSenseId === senseId) return "error";
      return "idle";
    },
    [savedSenses, savingSenseId, errorSenseId],
  );

  return { saveSense, getStatus };
}
