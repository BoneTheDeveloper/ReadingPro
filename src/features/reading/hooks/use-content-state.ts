// useContentState.ts
import { useState } from "react";
import { useWordTranslator } from "./use-word-translation";
import { useVocabulary } from "./use-store-vocabulary";

/**
 * Single composition seam consumed by `content-panel.tsx`. Both translators
 * expose their full surface (translator + vocabulary) via spread, so new
 * fields automatically appear here without touching this file.
 */
export function useContentState({ passageId }: { passageId: string | null | undefined }) {
  const [viewMode, setViewMode] = useState<"passage" | "pdf" | "video">(() => "passage");
  const translator = useWordTranslator(passageId, viewMode);

  const vocabulary = useVocabulary(
    translator.selectedWordInfo,
    translator.translationState.data
  );

  return {
    viewMode,
    setViewMode,
    ...translator,
    ...vocabulary,
  };
}