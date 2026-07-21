"use client";

import { useCallback, useState } from "react";
import type { TranslationDto, TranslationSelection } from "@/features/reading/schemas/translation";
import { saveVocabularyAction } from "@/features/vocabulary/server/actions/vocabulary";
import {
  clampTranslationContext,
  isTranslateTextWithinLimit,
} from "@/features/reading/lib/translation-limits";

let quickTranslationRequestCounter = 0;

type QuickTranslationStatus = "idle" | "ready" | "loading" | "success" | "error";

interface QuickTranslationState {
  requestId: number;
  data: TranslationDto | null;
  status: QuickTranslationStatus;
}

interface UseContentStateOptions {
  passageId: string | null | undefined;
}

export function useContentState({ passageId }: UseContentStateOptions) {
  const [viewMode, setViewMode] = useState<"passage" | "pdf" | "video">("passage");
  const [selection, setSelection] = useState<TranslationSelection | null>(null);
  const [quickTranslationState, setQuickTranslationState] =
    useState<QuickTranslationState>({
      requestId: 0,
      data: null,
      status: "idle",
    });
  const [savedVocabularyIds, setSavedVocabularyIds] = useState<Set<string>>(
    new Set(),
  );

  // Clear stale selection on passage/mode change
  const [prevPassageId, setPrevPassageId] = useState(passageId ?? null);
  const [prevViewMode, setPrevViewMode] = useState(viewMode);
  if (
    passageId !== prevPassageId ||
    viewMode !== prevViewMode
  ) {
    setPrevPassageId(passageId ?? null);
    setPrevViewMode(viewMode);
    setSelection(null);
    setQuickTranslationState((prev) => ({
      requestId: prev.requestId + 1,
      data: null,
      status: "idle",
    }));
  }

  const handleSelectionChange = useCallback(
    (sel: TranslationSelection | null) => {
      if (!sel) {
        setSelection(null);
        setQuickTranslationState((prev) => ({
          requestId: prev.requestId + 1,
          data: null,
          status: "idle",
        }));
        return;
      }

      const wordCount = sel.selectedText.trim().split(/\s+/).length;
      if (wordCount > 1) return;

      setSelection(sel);

      if (!isTranslateTextWithinLimit(sel.selectedText)) {
        setSelection(null);
        setQuickTranslationState((prev) => ({
          requestId: prev.requestId + 1,
          data: null,
          status: "idle",
        }));
        return;
      }

      setQuickTranslationState((prev) => ({
        requestId: prev.requestId + 1,
        data: null,
        status: "ready",
      }));
    },
    [],
  );

  const handleQuickTranslate = useCallback(() => {
    if (
      !selection ||
      quickTranslationState.status === "loading" ||
      !isTranslateTextWithinLimit(selection.selectedText)
    ) {
      return;
    }

    const requestId = ++quickTranslationRequestCounter;
    setQuickTranslationState((prev) => ({
      ...prev,
      requestId,
      status: "loading",
    }));

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: selection.selectedText,
        context: clampTranslationContext(
          selection.contextSentence,
          selection.selectedText,
        ),
        sourceId: selection.sourceId,
        sourceLanguage: "en",
        targetLanguage: "vi",
        clientMetrics: selection.clientMetrics,
      }),
    })
      .then(async (r) => {
        const json: unknown = await r.json();
        if (!r.ok || !json || typeof json !== "object") {
          throw new Error("Quick translation failed");
        }
        const data = json as { translation?: string; provider?: string };
        if (!data.translation) {
          throw new Error("Quick translation failed");
        }
        return data as TranslationDto;
      })
      .then((data) => {
        setQuickTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          return { requestId, data, status: "success" };
        });
      })
      .catch(() => {
        setQuickTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          return { requestId, data: null, status: "error" };
        });
      });
  }, [selection, quickTranslationState.status]);

  const handleSaveVocabulary = useCallback(async () => {
    const quickTranslation = quickTranslationState.data;
    if (!selection || !quickTranslation) return;

    try {
      await saveVocabularyAction({
        source: "TRANSLATE",
        sourceId: selection.sourceId,
        selectedText: selection.selectedText,
        translation: quickTranslation.translation,
        contextSentence: selection.contextSentence,
        sourceLanguage: "en",
        targetLanguage: "vi",
      });
      setSavedVocabularyIds((prev) =>
        new Set(prev).add(buildTranslationSelectionKey(selection)),
      );
    } catch {
      // Swallow: save failure surfaces via unsaved state, no error UI needed here.
    }
  }, [selection, quickTranslationState.data]);

  const vocabularySaveKey = selection
    ? buildTranslationSelectionKey(selection)
    : null;
  const isVocabularySaved = vocabularySaveKey
    ? savedVocabularyIds.has(vocabularySaveKey)
    : false;

  return {
    viewMode,
    setViewMode,
    selection,
    quickTranslationState,
    savedVocabularyIds,
    isVocabularySaved,
    handleSelectionChange,
    handleQuickTranslate,
    handleSaveVocabulary,
  };
}

function buildTranslationSelectionKey(selection: TranslationSelection) {
  return JSON.stringify({
    sourceId: selection.sourceId,
    selectedText: selection.selectedText,
    contextSentence: selection.contextSentence,
    targetLanguage: selection.targetLanguage,
  });
}
