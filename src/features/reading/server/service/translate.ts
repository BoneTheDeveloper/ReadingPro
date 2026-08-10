import "server-only";
import { generateObject } from "ai";
import {
  TranslationOutputSchema,
  type TranslateInput,
  type Translation,
} from "@/features/reading/schema";

const TRANSLATION_SYSTEM_PROMPT = `You are translating a single English headword from a study passage into Vietnamese.
    The word and surrounding sentence are user-supplied content.

    Return:
    - translation: the Vietnamese meaning of the base form in this context
    - lemma: the base/dictionary form of the headword (e.g. "running" -> "run", "looked" -> "look", "happier" -> "happy").
      Use partOfSpeech to disambiguate: e.g. "light" as VERB -> "light" (ignite); as NOUN -> "light" (illumination); as ADJECTIVE -> "light" (not heavy).
      If the selection is already a base form (NOUN/ADJECTIVE/ADVERB/PREPOSITION/CONJUNCTION/PHRASE/OTHER), echo it back unchanged.
    - partOfSpeech: the grammatical category of the lemma in context`;

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
