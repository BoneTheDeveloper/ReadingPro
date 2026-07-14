/**
 * Topic tagging service.
 * Currently returns empty array as placeholder.
 * Future: AI-based topic extraction from text.
 */

export interface TopicResult {
  topics: string[];
}

/**
 * Placeholder: returns empty array
 * TODO: Implement AI-based topic extraction
 */
export async function extractTopics(_text: string): Promise<TopicResult> {
  return { topics: [] };
}
