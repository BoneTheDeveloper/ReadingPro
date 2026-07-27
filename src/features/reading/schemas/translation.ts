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

/**
 * Part-of-speech taxonomy returned by the LLM. `unknown` is a valid value
 * (model cannot classify with confidence) and is hidden by the popup — every
 * other value renders as a small badge.
 */
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

/**
 * Bundle response from `POST /api/translate`. One server-side LLM call returns
 * all three pieces. `provider` is the literal `"openai"` for this plan.
 *
 * `translation` may be empty when the LLM cannot translate the headword — the
 * popup renders the soft empty state in that case. `ipa` is null when the
 * model is not confident; the popup hides the IPA line. `partOfSpeech` falls
 * back to `"unknown"` for the same reason; the popup hides the badge.
 */
export type TranslationDto = {
  translation: string;
  ipa: string | null;
  partOfSpeech: PartOfSpeech;
  provider: "openai";
};

/**
 * Typed error envelope from `POST /api/translate`. Codes map to HTTP statuses
 * in the route; the popup surfaces `error` for any failure and keeps the retry
 * button.
 */
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

/**
 * Input the browser posts. The server zod-validates the same shape. `text` is
 * the headword; `context` is the surrounding sentence so the LLM can anchor
 * the translation, IPA, and POS to in-sentence usage.
 */
export type TranslateInput = {
  text: string;
  context: string;
  sourceId: string;
  sourceLanguage: "en";
  targetLanguage: "vi";
};
