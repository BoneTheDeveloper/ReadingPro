// useContentState.ts
import { useEffect, useState } from "react";
import { useWordTranslator } from "./use-word-translation";
import { useVocabulary } from "./use-store-vocabulary";

export function useContentState({ passageId }: { passageId: string | null | undefined }) {
  const [viewMode, setViewMode] = useState<"passage" | "pdf" | "video">("passage");

  // Reset view mode when switching passages so a stale mode (e.g. "pdf" from
  // a previous passage) doesn't hide the wrong content on the next passage.
  useEffect(() => {
    setViewMode("passage");
  }, [passageId]);

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