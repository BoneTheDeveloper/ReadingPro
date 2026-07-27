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

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "interjection"
  | "determiner"
  | "unknown";


export type TranslationDto = {
  translation: string;
  ipa: string | null;
  partOfSpeech: PartOfSpeech;
  provider: "openai";
};

export type TranslateErrorCode =
  | "unauthenticated"
  | "bad_request"
  | "not_found"
  | "rate_limited"
  | "upstream"
  | "timeout"
  | "parse"
  | "aborted";

export type TranslateErrorBody = {
  error: { code: TranslateErrorCode; message: string };
};
