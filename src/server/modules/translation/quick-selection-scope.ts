import "server-only";
export type QuickSelectionScope = "dictionary" | "machine";

const SENTENCE_END_RE = /[.!?]$/;
const MAX_DICTIONARY_TOKENS = 4;
const MAX_DICTIONARY_CHARS = 40;

/**
 * Classify a quick translation selection as dictionary or machine scope.
 *
 * - dictionary: single word or short phrase (up to 4 tokens, no sentence-ending
 *   punctuation). Resolved through the contextual dictionary + deterministic fallback.
 * - machine: sentence, paragraph, or longer phrase. Resolved through cache-first
 *   non-AI machine translation on cache miss.
 */
export function getQuickSelectionScope(text: string): QuickSelectionScope {
  const trimmed = text.trim();

  if (trimmed.includes("\n")) return "machine";
  if (SENTENCE_END_RE.test(trimmed)) return "machine";

  const tokens = trimmed.split(/\s+/);
  if (tokens.length > MAX_DICTIONARY_TOKENS) return "machine";
  if (trimmed.length > MAX_DICTIONARY_CHARS) return "machine";

  return "dictionary";
}
