/**
 * Data-only shape of a selected word, passed from the browser selection event
 * through the hook state into the popup. Positioning data lives separately in
 * `selection-utils.ts` so the popup can attach it as a Floating UI reference.
 */
export type WordSelection = {
  selectedText: string;
  contextSentence: string;
  sourceId: string;
  targetLanguage: "vi";
};

export type TranslationDto = {
  translation: string | null;
  ipa: string | null;
  provider: "cache" | "fallback" | "google_translate";
};
