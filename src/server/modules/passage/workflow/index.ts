/**
 * Passage processing workflow.
 * Orchestrates preprocessing and AI processing with durable execution.
 */
import { preprocessStep, aiProcessStep, failStep, type PassageProcessingInput } from "./steps";

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
