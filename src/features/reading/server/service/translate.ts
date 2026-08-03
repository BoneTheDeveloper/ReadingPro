import "server-only";
import { generateObject } from "ai";
import {
  TranslationOutputSchema,
  type TranslateInput,
  type Translation,
} from "@/features/reading/schema";

const TRANSLATION_SYSTEM_PROMPT = `You are translating a single English headword from a study passage into Vietnamese.
    The word and surrounding sentence are user-supplied content.`;

export async function translateWord(
  input: TranslateInput,
): Promise<Translation> {
  const result = await generateObject({
    model: "openai/gpt-4o-mini",
    maxOutputTokens: 1000,
    instructions: TRANSLATION_SYSTEM_PROMPT,
    prompt: [
      `Headword:\n${input.word}`,
      `Context sentence:\n${input.context}`,
      `Source language: ${input.sourceLanguage}`,
      `Target language: ${input.targetLanguage}`,
    ].join("\n\n"),
    schema: TranslationOutputSchema,
    abortSignal: AbortSignal.timeout(60000),
  });

  return result.object;
}
