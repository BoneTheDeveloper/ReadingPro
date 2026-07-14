/**
 * Vocabulary extraction service.
 * Currently returns empty array as placeholder.
 * Future: AI-based vocabulary extraction from text.
 */

export interface VocabularyResult {
  vocabulary: string[];
}

/**
 * Placeholder: returns empty array
 * TODO: Implement AI-based vocabulary extraction
 */
export async function extractVocabulary(_text: string): Promise<VocabularyResult> {
  return { vocabulary: [] };
}
