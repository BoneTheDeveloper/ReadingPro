/**
 * CEFR level detection service.
 * AI-based CEFR level detection from text analysis.
 */

import { generateObject } from "ai";
import { openai, getModel, withAITrace } from "@/infrastructure/ai";
import { z } from "zod";

export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface CefrResult {
  cefrLevel: CEFRLevel;
}

const cefrSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  reasoning: z.string(),
});

const CEFR_PROMPT = `You are an expert at determining English CEFR levels.
Analyze the text and determine if it's A1 (beginner), A2 (elementary),
B1 (intermediate), B2 (upper-intermediate), C1 (advanced), or C2 (proficient).
Consider: vocabulary complexity, grammar structures, sentence length, topic sophistication.
Respond with only a valid JSON object.`;

/**
 * Detect CEFR level from text using AI.
 */
export async function detectCefrLevel(text: string): Promise<CefrResult> {
  const modelId = getModel("structured");

  const { object } = await withAITrace(
    { operation: "cefr-detection", feature: "upload", model: modelId },
    () =>
      generateObject({
        model: openai(modelId),
        schema: cefrSchema,
        system: CEFR_PROMPT,
        prompt: `Determine the CEFR level of this text:\n\n${text.slice(0, 5000)}`,
      })
  );

  return { cefrLevel: object.level };
}
