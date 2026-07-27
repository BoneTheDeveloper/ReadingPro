"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  TranslationDto,
} from "@/features/reading/schemas/translation";

import type {
  WordSelection
} from "@/features/reading/utils/word-selection";

type TranslationStatus = "idle" | "ready" | "loading" | "success" | "error";

export interface TranslationState {
  requestId: number;
  data: TranslationDto | null;
  status: TranslationStatus;
}

let translationRequestCounter = 0;

/**
 * Owns inline-translation state and ensures only the latest request can update
 * the popup. Changing the passage, view, or selection aborts pending work.
 */
export function useWordTranslator(
  passageId: string | null | undefined,
  viewMode: string,
) {
  const [selectedWordInfo, setSelectedWordInfo] = useState<WordSelection | null>(
    null,
  );
  const [translationState, setTranslationState] = useState<TranslationState>({
    requestId: 0,
    data: null,
    status: "idle",
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const prevPassageIdRef = useRef(passageId ?? null);
  const prevViewModeRef = useRef(viewMode);

  const resetTranslation = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setSelectedWordInfo(null);
    setTranslationState((prev) => ({
      requestId: prev.requestId + 1,
      data: null,
      status: "idle",
    }));
  }, []);

  useEffect(() => {
    if (
      passageId !== prevPassageIdRef.current ||
      viewMode !== prevViewModeRef.current
    ) {
      prevPassageIdRef.current = passageId ?? null;
      prevViewModeRef.current = viewMode;
      resetTranslation();
    }
  }, [passageId, resetTranslation, viewMode]);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const handleWordSelection = useCallback(
    (selection: WordSelection | null) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;

      if (!selection) {
        resetTranslation();
        return;
      }

      setSelectedWordInfo(selection);
      setTranslationState((prev) => ({
        requestId: prev.requestId + 1,
        data: null,
        status: "ready",
      }));
    },
    [resetTranslation],
  );

  const translateWord = useCallback(async () => {
    if (!selectedWordInfo || translationState.status === "loading") {
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const requestId = ++translationRequestCounter;
    setTranslationState({ requestId, data: null, status: "loading" });

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: selectedWordInfo.selectedText,
          context: selectedWordInfo.contextSentence,
          sourceId: selectedWordInfo.sourceId,
          sourceLanguage: "en",
          targetLanguage: selectedWordInfo.targetLanguage,
        }),
        signal: controller.signal,
      });

      if (response.status === 401) {
        resetTranslation();
        return;
      }
      if (!response.ok) {
        throw new Error(`Translation request failed with ${response.status}`);
      }

      const data = (await response.json()) as TranslationDto;
      setTranslationState((prev) =>
        prev.requestId === requestId
          ? { requestId, data, status: "success" }
          : prev,
      );
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      setTranslationState((prev) =>
        prev.requestId === requestId
          ? { requestId, data: null, status: "error" }
          : prev,
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [resetTranslation, selectedWordInfo, translationState.status]);

  return {
    selectedWordInfo,
    translationState,
    handleWordSelection,
    translateWord,
  };
}
