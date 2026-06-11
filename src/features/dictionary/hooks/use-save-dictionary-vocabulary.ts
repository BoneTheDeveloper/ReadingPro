"use client";

import { useCallback, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import {
  vocabularyResponseSchema,
} from "@/lib/translation/shared/translation-response-schema";
import type {
  DictionaryEntryDto,
  DictionarySenseDto,
} from "@/lib/dictionary/shared/dictionary-dtos";

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

  const buildKey = (entryId: string, senseId: string) => `${entryId}:${senseId}`;

  const saveSense = useCallback(
    async (entry: DictionaryEntryDto, sense: DictionarySenseDto) => {
      const key = buildKey(entry.id, sense.id);

      if (savedSenses.has(key) || pendingRef.current) return;

      const primary = sense.translations.find((t) => t.isPrimary) ?? sense.translations[0];
      if (!primary) return;

      pendingRef.current = true;
      setSavingSenseId(sense.id);
      setErrorSenseId(null);

      try {
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

        Sentry.addBreadcrumb({
          category: "dictionary-vocabulary",
          level: "info",
          message: "dictionary-vocabulary-save-click",
          data: { entryId: entry.id, senseId: sense.id },
        });

        const res = await fetch("/api/vocabulary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json: unknown = await res.json();
        const parsed = vocabularyResponseSchema.safeParse(json);

        if (!parsed.success) {
          Sentry.addBreadcrumb({
            category: "dictionary-vocabulary",
            level: "error",
            message: "dictionary-vocabulary-schema-error",
            data: { route: "/api/vocabulary" },
          });
          throw new Error("Vocabulary save failed");
        }

        if (!res.ok || "error" in parsed.data) {
          throw new Error("Vocabulary save failed");
        }

        setSavedSenses((prev) => new Set(prev).add(key));
        Sentry.addBreadcrumb({
          category: "dictionary-vocabulary",
          level: "info",
          message: "dictionary-vocabulary-save-success",
          data: { vocabularyItemId: parsed.data.data.id },
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
