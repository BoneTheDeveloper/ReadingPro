// The spellings a selected word is looked up under. Relative imports only:
// scripts/dictionary-coverage.ts runs this file under plain Node.
import lemmatizer from "wink-lemmatizer";

/** The selected word as written: lowercased, and without a possessive "'s". */
export function surfaceForms(word: string): string[] {
  const lower = word.trim().toLowerCase();
  return [...new Set([lower, lower.replace(/'s?$/, "")])].filter(Boolean);
}

/** Base forms to try when the word is inflected, most useful first: verb, noun, adjective. */
export function baseForms(surface: string): string[] {
  return [lemmatizer.verb(surface), lemmatizer.noun(surface), lemmatizer.adjective(surface)];
}
