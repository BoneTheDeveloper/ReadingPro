/**
 * Text normalization service.
 * Provides basic text cleanup matching existing parsePDF behavior.
 * Future: More sophisticated cleaning (encoding normalization, special chars).
 */

export async function normalizeText(text: string): Promise<string> {
  return text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ") // Collapse spaces/tabs
    .replace(/\n{3,}/g, "\n\n") // Collapse excessive newlines
    .trim();
}
