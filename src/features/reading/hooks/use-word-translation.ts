"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  TranslationDto,
  WordSelection,
} from "@/features/reading/schemas/translation";

type TranslationStatus = "idle" | "ready" | "loading" | "success" | "error";

export interface TranslationState {
  requestId: number;
  data: TranslationDto | null;
  status: TranslationStatus;
}

let translationRequestCounter = 0;

/**
 * Static lookup the placeholder UI renders. Phase 3 replaces the body of
 * `translateWord` with a real `fetch("/api/translate", ...)` call.
 */
const PLACEHOLDER_LOOKUP: Record<string, TranslationDto> = {
  priority: {
    translation: "LÀM",
    ipa: null,
    provider: "fallback",
  },
  gesture: {
    translation: "cử chỉ",
    ipa: null,
    provider: "fallback",
  },
};

function lookupPlaceholder(selectedText: string): TranslationDto {
  const key = selectedText.trim().toLowerCase();
  return (
    PLACEHOLDER_LOOKUP[key] ?? {
      translation: null,
      ipa: null,
      provider: "fallback",
    }
  );
}

/**
 * Phase 2 placeholder translator.
 *
 * Flow: `idle` -> `ready` (on selection) -> `loading` (on translate) -> `success` /
 * `error` (200ms simulated). No fetch goes out. Phase 3 swaps the body of
 * `translateWord` for a real `fetch` call.
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

  const prevPassageIdRef = useRef(passageId ?? null);
  const prevViewModeRef = useRef(viewMode);

  useEffect(() => {
    if (
      passageId !== prevPassageIdRef.current ||
      viewMode !== prevViewModeRef.current
    ) {
      prevPassageIdRef.current = passageId ?? null;
      prevViewModeRef.current = viewMode;
      setSelectedWordInfo(null);
      setTranslationState((prev) => ({
        requestId: prev.requestId + 1,
        data: null,
        status: "idle",
      }));
    }
  }, [passageId, viewMode]);

  const handleWordSelection = useCallback(
    (sel: WordSelection | null) => {
      if (!sel) {
        setSelectedWordInfo(null);
        setTranslationState((prev) => ({
          requestId: prev.requestId + 1,
          data: null,
          status: "idle",
        }));
        return;
      }

      setSelectedWordInfo(sel);
      setTranslationState((prev) => ({
        requestId: prev.requestId + 1,
        data: null,
        status: "ready",
      }));
    },
    [],
  );

  const translateWord = useCallback(() => {
    if (!selectedWordInfo || translationState.status === "loading") {
      return;
    }

    const requestId = ++translationRequestCounter;
    setTranslationState((prev) => ({ ...prev, requestId, status: "loading" }));

    // 200ms simulated latency so the skeleton -> success transition is visible.
    // Phase 3 replaces this timer with a real fetch.
    const timer = setTimeout(() => {
      setTranslationState((prev) => {
        if (prev.requestId !== requestId) return prev;
        return {
          requestId,
          data: lookupPlaceholder(selectedWordInfo.selectedText),
          status: "success",
        };
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedWordInfo, translationState.status]);

  return {
    selectedWordInfo,
    translationState,
    handleWordSelection,
    translateWord,
  };
}
