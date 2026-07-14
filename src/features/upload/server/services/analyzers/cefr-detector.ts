/**
 * CEFR level detection service.
 * Currently returns hardcoded "B2" as placeholder.
 * Future: AI-based CEFR detection from text analysis.
 */

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface CefrResult {
  cefrLevel: CEFRLevel;
}

/**
 * Placeholder: returns hardcoded default
 * TODO: Implement AI-based CEFR detection
 */
export async function detectCefrLevel(_text: string): Promise<CefrResult> {
  return { cefrLevel: "B2" };
}
