import "server-only";
import { generateObject } from "ai";
import { DeepseekProcessPassageResponseSchema } from "@/features/passage/schema";
import { completePassageProcessing } from "@/features/passage/server/service/passage-crud";

const PROCESS_PROMPT = `You clean and analyze English passages for language learners.

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
) {

      const result = await generateObject({
        model: "deepseek/deepseek-v4-flash",
        schema: DeepseekProcessPassageResponseSchema,
        system: PROCESS_PROMPT,
        prompt: [
          `User-supplied title: ${userTitle || "(none)"}`,
          "Passage:",
          cleanedText,
        ].join("\n"),
        temperature: 0.2,
        abortSignal: AbortSignal.timeout(200_000),
      });

      if (!result.object) {
        throw new Error("No object generated");
      }

      return {
        text: result.object.text,
        cefrLevel: result.object.cefrLevel,
        title: result.object.title,
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
