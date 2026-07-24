"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TranslationDto, TranslationSelection } from "@/features/reading/schemas/translation";


let translationRequestCounter = 0;

type TranslationStatus = "idle" | "ready" | "loading" | "success" | "error";

export interface TranslationState {
  requestId: number;
  data: TranslationDto | null;
  status: TranslationStatus;
}

export function useWordTranslator(
  passageId: string | null | undefined,
  viewMode: string
) {
  const [selectedWordInfo, setSelectedWordInfo] = useState<TranslationSelection | null>(null);
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
    (sel: TranslationSelection | null) => {
      if (!sel) {
        setSelectedWordInfo(null);
        setTranslationState((prev) => ({
          requestId: prev.requestId + 1,
          data: null,
          status: "idle",
        }));
        return;
      }

      const wordCount = sel.selectedText.trim().split(/\s+/).length;
      if (wordCount > 1) return;

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
    if (
      !selectedWordInfo ||
      translationState.status === "loading"
    ) {
      return;
    }

    const requestId = ++translationRequestCounter;
    setTranslationState((prev) => ({
      ...prev,
      requestId,
      status: "loading",
    }));

    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: selectedWordInfo.selectedText,
        context: selectedWordInfo.contextSentence,
        sourceId: selectedWordInfo.sourceId,
        sourceLanguage: "en",
        targetLanguage: "vi",
        clientMetrics: selectedWordInfo.clientMetrics,
      }),
    })
      .then(async (r) => {
        const json: unknown = await r.json();
        if (!r.ok || !json || typeof json !== "object") {
          throw new Error("Word translation failed");
        }
        const data = json as { translation?: string; provider?: string };
        if (!data.translation) {
          throw new Error("Word translation failed");
        }
        return data as TranslationDto;
      })
      .then((data) => {
        setTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          return { requestId, data, status: "success" };
        });
      })
      .catch(() => {
        setTranslationState((prev) => {
          if (prev.requestId !== requestId) return prev;
          return { requestId, data: null, status: "error" };
        });
      });
  }, [selectedWordInfo, translationState.status]);

  return {
    selectedWordInfo,
    translationState,
    handleWordSelection,
    translateWord,
  };
}