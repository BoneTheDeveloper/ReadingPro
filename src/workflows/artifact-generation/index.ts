/**
 * Artifact generation workflow.
 * Orchestrates AI artifact generation (flashcard/question) with durable execution.
 */
import type { ArtifactGenerationInput } from "./steps";
import { generateArtifactStep, failStep } from "./steps";

export async function artifactGenerationWorkflow(args: ArtifactGenerationInput) {
  "use workflow";

  try {
    await generateArtifactStep(args);
  } catch (err) {
    // Fatal failure - mark artifact as failed
    await failStep(args);
    throw err;
  }
}
