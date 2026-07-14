/**
 * PDF text normalization service.
 * Provides cleanup specific to extracted PDF text.
 * Future: Remove headers/footers, page numbers, footnotes.
 */

export async function normalizePdfText(text: string): Promise<string> {
  // Current: basic cleanup matching parsePDF behavior
  return text
    .replace(/\f/g, "\n\n") // Form feeds → double newline
    .replace(/[ \t]+/g, " ") // Collapse whitespace
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .join("\n")
    .trim();
}
