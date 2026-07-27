/**
 * Vocabulary extraction service.
 * AI-based vocabulary extraction from text.
 */

import { generateObject } from "ai";
import { z } from "zod";

export interface VocabularyResult {
  vocabulary: string[];
}

const vocabSchema = z.object({
  vocabulary: z.array(z.string()).max(50),
  reasoning: z.string(),
});

const VOCAB_PROMPT = `Extract up to 50 important vocabulary words from the text.
Focus on: mid-frequency words, domain-specific terms, useful expressions.
Exclude: very common words (the, a, is, etc.), proper nouns.
Respond with only a valid JSON object.`;

/**
 * Extract vocabulary from text using AI.
 */
export async function extractVocabulary(text: string): Promise<VocabularyResult> {
  const { object } = await generateObject({
    model: "openai/gpt-4o-mini",
    schema: vocabSchema,
    system: VOCAB_PROMPT,
    prompt: `Extract key vocabulary from:\n\n${text.slice(0, 5000)}`,
  });

  return { vocabulary: object.vocabulary };
}