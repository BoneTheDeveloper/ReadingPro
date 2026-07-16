// =============================================================================
// OUTPUT — server returns this (DTO)
// =============================================================================

export interface TranslationDto {
  translation: string;
  type: string | null;
  provider: "cache" | "dictionary" | "fallback" | "google_translate" | "ai";
}

// =============================================================================
// SHARED TYPES — not schemas, used across features
// =============================================================================

export interface TranslationSelection {
  selectedText: string;
  selectionRect: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  actionRect?: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  contextSentence: string;
  sourceId: string;
  targetLanguage: "vi";
  clientMetrics?: {
    wordsBeforeSelected: number;
  };
}
