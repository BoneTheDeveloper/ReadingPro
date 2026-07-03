/** Lowercase + collapse whitespace + trim. Single source of truth for vocabulary dedup keys. */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export function detectType(text: string): "WORD" | "PHRASE" {
  return text.includes(" ") ? "PHRASE" : "WORD";
}
