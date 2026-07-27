import type {
  TranslationDto,
} from "@/features/reading/schemas/translation";


/**
 * Phase 2 placeholder. Returns a no-op vocabulary surface so `useContentState`
 * can compose a complete response shape without a real save flow. The
 * vocabulary-save-toggle plan replaces this file when the real save flow ships.
 */
export function useVocabulary(
  _translationData: TranslationDto | null,
) {
  return {
    savedVocabularyIds: new Set<string>(),
    isVocabularySaved: false,
    handleSaveVocabulary: async () => {},
  };
}
