export type TranslateResolutionSource =
  | "cache"
  | "dictionary"
  | "phrase"
  | "fallback"
  | "google_translate";

const WORD_RE = /[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g;

export function countWords(value: string): number {
  return value.match(WORD_RE)?.length ?? 0;
}
