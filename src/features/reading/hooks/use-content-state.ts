// useContentState.ts
import { useState } from "react";
import { useWordTranslator } from "./use-word-translation";
import { useVocabulary } from "./use-store-vocabulary";

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