import "server-only";
import { generateObject } from "ai";
import {
  passageProccesingOutputchema,
  type PassageProccesingOuput,
} from "@/features/passage/schema";
import { completePassageProcessing } from "@/features/passage/server/service/passage-crud";

const PROCESS_PROMPT = `You clean and analyze English passages for language learners.

Return:
- text: the cleaned passage, following the cleaning rules below
- cefrLevel: the passage's CEFR level, one of A1, A2, B1, B2, C1, C2
- title: a concise descriptive title (max 50 characters) capturing the main topic

Cleaning:
Restore capitalization (sentence starts, proper nouns, "I", acronyms, titles, brands) and terminal punctuation.
Restore apostrophes in contractions and possessives (dont → don't, its vs it's).
Restore paragraph breaks at genuine paragraph starts, separated by one blank line.
Remove spoken-only fillers (um, uh, er) — nothing else.

Constraints:
Never summarize, shorten, expand, translate, or explain. Keep every idea in its original order.
Never invent facts, names, numbers, or sentences.
Keep the author's vocabulary and register. Do not simplify or "upgrade" word choice — learners need authentic English.
Keep unintelligible fragments as-is rather than guessing.`;

async function processPassage(
  cleanedText: string,
  userTitle: string,
): Promise<PassageProccesingOuput> {
  const { object } = await generateObject({
    model: "deepseek/deepseek-v4-flash",
    schema: passageProccesingOutputchema,
    abortSignal: AbortSignal.timeout(170_000),
    instructions: PROCESS_PROMPT,
    prompt: [
      `User-supplied title: ${userTitle || "(none)"}`,
      "Passage:",
      cleanedText,
    ].join("\n"),
    temperature: 0.2,
  });

  return object;
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
