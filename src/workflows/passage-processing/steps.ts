/**
 * Step functions for passage processing.
 */
import { preprocessPassage } from "@/server/services/passage/passage-preprocessing";
import { runPassageProcessing } from "@/server/services/passage/passage-processing";
import { failPassageProcessing } from "@/server/services/passage/passage-crud";
import type { CreatePassageInput } from "@/shared/contracts/passage";

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
