// useContentState.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { useInlineTranslate } from "./use-word-translation";
import { useVocabulary } from "./use-store-vocabulary";
import type {
  WordSelection,
} from "@/features/reading/utils/word-selection";

/**
 * Shape consumed by `inline-translation-popup`. Kept identical to the prior
 * implementation so the popup can be migrated independently of this seam.
 */
export type TranslationStatus = "idle" | "ready" | "loading" | "success" | "error";

export interface TranslationState {
  requestId: number;
  data: import("@/features/reading/schemas/translation").TranslationDto | null;
  status: TranslationStatus;
}

const EMPTY: TranslationState = {
  requestId: 0,
  data: null,
  status: "idle",
};

let requestCounter = 0;

/**
 * Single composition seam consumed by `content-panel.tsx`. Delegates the actual
 * fetch/cache/abort to `useInlineTranslate` while preserving the broader
 * surface (`selectedWordInfo`, `translationState`, `handleWordSelection`,
 * `translateWord`) that the popup expects.
 *
 * Derives `translationState` from the hook's `state` plus the current
 * selection. A selection without a fetch result renders as `ready`; the hook's
 * `done` and `error` map to `success` and `error`.
 */
export function useContentState({ passageId: _passageId }: { passageId: string | null | undefined }) {
  const [viewMode, setViewMode] = useState<"passage" | "pdf" | "video">(() => "passage");
  const [selectedWordInfo, setSelectedWordInfo] = useState<WordSelection | null>(null);
  const [loadingRequestId, setLoadingRequestId] = useState(0);
  const selectedRef = useRef<WordSelection | null>(null);

  const translator = useInlineTranslate();

  useEffect(() => {
    selectedRef.current = selectedWordInfo;
  }, [selectedWordInfo]);

  const resetTranslation = useCallback(() => {
    setSelectedWordInfo(null);
    selectedRef.current = null;
    setLoadingRequestId(0);
  }, []);

  const handleWordSelection = useCallback(
    (selection: WordSelection | null) => {
      if (!selection) {
        resetTranslation();
        return;
      }
      setSelectedWordInfo(selection);
      setLoadingRequestId(0);
    },
    [resetTranslation],
  );

  const translateWord = useCallback(async () => {
    const selection = selectedRef.current;
    if (!selection) return;
    const requestId = ++requestCounter;
    setLoadingRequestId(requestId);
    await translator.translate(selection.selectedText, selection.contextSentence);
  }, [translator]);

  const translationState: TranslationState = (() => {
    if (selectedWordInfo === null) return EMPTY;
    const inner = translator.state;
    if (inner.status === "loading") {
      return { requestId: loadingRequestId, data: null, status: "loading" };
    }
    if (inner.status === "done") {
      return { requestId: loadingRequestId, data: inner.data, status: "success" };
    }
    if (inner.status === "error") {
      return { requestId: loadingRequestId, data: null, status: "error" };
    }
    return { requestId: 0, data: null, status: "ready" };
  })();

  const vocabulary = useVocabulary(
    selectedWordInfo,
    translationState.data
  );

  return {
    viewMode,
    setViewMode,
    selectedWordInfo,
    translationState,
    handleWordSelection,
    translateWord,
    ...vocabulary,
  };
}