import "server-only";
import { generateText, Output } from "ai";
import { DeepseekProcessPassageResponseSchema } from "@/features/passage/schema";
import { completePassageProcessing } from "@/features/passage/server/service/passage-crud";


const PROCESS_PROMPT = `You clean and analyze English passages for language learners.

Cleaning:
- Restore capitalization (sentence starts, proper nouns, "I", acronyms, titles, brands) and terminal punctuation.
- Restore apostrophes in contractions and possessives (dont → don't, its vs it's).
- Restore paragraph breaks at genuine paragraph starts, separated by one blank line.
- Remove spoken-only fillers (um, uh, er) — nothing else.

Constraints:
- Never summarize, shorten, expand, translate, or explain. Keep every idea in its original order.
- Never invent facts, names, numbers, or sentences.
- Keep the author's vocabulary and register. Do not simplify or "upgrade" word choice — learners need authentic English.
- Keep unintelligible fragments as-is rather than guessing.`;


async function processPassage(
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
    timeout: 120_000,
    temperature: 0.2,
    maxOutputTokens: 8000,
  });

  const parsed = result.output;

  if (!parsed) {
    throw new Error("AI returned no structured output");
  }

  return {
    text: parsed.text,
    cefrLevel: parsed.cefrLevel,
    title: parsed.title,
  };
}


export async function runPassageProcessing(args: {
  userId: string;
  passageId: string;
  cleanedText: string;
  userTitle: string;
}): Promise<void> {
  const { text, cefrLevel, title } = await processPassage(
    args.cleanedText,
    args.userTitle,
  );

   await completePassageProcessing({
     userId: args.userId,
    passageId: args.passageId,
    content: text,
    title,
    cefrLevel,
  });
}
