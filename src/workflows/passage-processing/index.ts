/**
 * Passage processing workflow.
 * Orchestrates preprocessing and AI processing with durable execution.
 */
import type { CreatePassageInput } from "@/features/passage/schema";
import { preprocessStep, aiProcessStep, failStep } from "./steps";

export interface PassageProcessingInput {
  passageId: string;
  input: CreatePassageInput;
  userId: string;
}

export async function passageProcessingWorkflow(args: PassageProcessingInput) {
  "use workflow";

  try {
    // Step 1: Preprocess (text extraction + normalization)
    const { normalized } = await preprocessStep(args);

    // Step 2: Run AI processing (metadata + content)
    await aiProcessStep({ ...args, normalized });
  } catch (err) {
    // Fatal failure - mark passage as failed
    await failStep(args);
    throw err;
  }
}
