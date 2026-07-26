type SelectionRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type ClientMetrics = {
  wordsBeforeSelected: number;
};

export type TranslationSelection = {
  selectedText: string;
  selectionRect: SelectionRect;
  actionRect?: SelectionRect;
  contextSentence: string;
  sourceId: string;
  targetLanguage: "vi";
  kind: "word" | "phrase";
  clientMetrics?: ClientMetrics;
};

export type TranslationDto = {
  translation: string | null;
  type: "word" | "phrase" | null;
  ipa: string | null;
  provider: "cache" | "fallback" | "google_translate";
};
