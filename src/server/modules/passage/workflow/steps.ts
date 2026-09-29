/**
 * Step functions for passage processing.
 */
import { preprocessPassage } from "../passage-preprocessing";
import { runPassageProcessing } from "../passage-processing";
import { failPassageProcessing } from "../passage-crud";
import type { CreatePassageInput } from "@/shared/passage/schema";

export interface PassageProcessingInput {
  passageId: string;
  input: CreatePassageInput;
  userId: string;
}

export async function preprocessStep(args: PassageProcessingInput) {
  "use step";
  const { normalized } = await preprocessPassage(args.input);
  return { normalized };
}

export async function aiProcessStep(
  args: PassageProcessingInput & { normalized: string },
) {
  "use step";
  await runPassageProcessing({
    passageId: args.passageId,
    userId: args.userId,
    normalizedText: args.normalized,
    userTitle: args.input.title,
  });
}
export async function failStep(args: PassageProcessingInput) {
  "use step";
  await failPassageProcessing({
    passageId: args.passageId,
    userId: args.userId,
  });
}
