import "server-only";
import { generateText, Output } from "ai";
import { DeepseekProcessPassageResponseSchema } from "@/features/passage/schema";


const PROCESS_PROMPT = `You are an English-language content analyzer and text cleaner.

First, clean the passage text:
- Restore sentence boundaries: capitalize the first word of each sentence and add terminal punctuation (. ? !).
- Capitalize proper nouns, the pronoun "I", acronyms, titles, and brand names.
- Restore apostrophes in contractions and possessives (dont -> don't, its vs it's).
- Restore paragraph breaks at genuine paragraph starts; separate paragraphs with one blank line.
- Delete filler words only if they are clearly spoken-only artifacts (um, uh, er).

Hard rules for cleaning:
- Never summarize, shorten, expand, translate, or explain. Keep every idea in the original order.
- Never invent facts, names, numbers, or sentences that are not in the input.
- Keep the author's vocabulary and register. Do not "upgrade" or simplify word choice — learners study this text to meet authentic English.
- If a passage fragment is unintelligible, keep it as-is rather than guessing.

Second, analyze the passage:
- Determine the CEFR level (A1 beginner → C2 proficient).
- Suggest a concise descriptive title (≤ 50 chars) capturing the main topic.

Return a JSON object with:
- text: the cleaned passage
- cefrLevel: the CEFR level
- title: the descriptive title`;



export async function processPassage(
  cleanedText: string,
  userTitle: string,
) {

  const result = await generateText({
    model: "deepseek/deepseek-v4-flash",
    instructions: PROCESS_PROMPT,
    prompt: [
      `User-supplied title: ${userTitle || "(none)"}`,
      "Passage:",
      cleanedText,
    ].join("\n"),
    output: Output.object({ schema: DeepseekProcessPassageResponseSchema }),
    abortSignal: AbortSignal.timeout(60_000),
    temperature: 0.2,
  });

  const parsed = result.output;

  return {
    text: parsed.text,
    cefrLevel: parsed.cefrLevel ?? null,
    title: parsed.title,
  };
}
