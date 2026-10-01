import { start } from "workflow/api";
import { AppError } from "@/server/lib/errors";
import { StudioArtifactType } from "@/server/db/generated/enums";
import { requireReadyPassage } from "@/server/modules/passage";
import { flashcardProgressSchema, questionProgressSchema } from "@/shared/studio/artifact";
import { createArtifact, getArtifact, updateArtifactProgress } from "./artifact-repository";
import { artifactGenerationWorkflow } from "./workflow/index";

export { deleteArtifact, listArtifactsForUser } from "./artifact-repository";

/** Saves the artifact as PENDING and hands it to the generation workflow. */
export async function requestArtifactForUser(
  userId: string,
  passageId: string,
  type: StudioArtifactType,
) {
  // Generating from an unprocessed passage would feed the model empty content.
  await requireReadyPassage(userId, passageId);

  const artifact = await createArtifact({ passageId, userId, type, status: "PENDING" });

  await start(artifactGenerationWorkflow, [{ artifactId: artifact.id, userId, passageId, type }]);

  return artifact;
}

/**
 * A non-terminal or failed artifact has no content to serve, so it is 404
 * rather than a 200 with a null body.
 */
export async function getCompletedArtifactForUser(userId: string, id: string) {
  const artifact = await getArtifact(id, userId);
  if (artifact.status !== "COMPLETED") throw new AppError("artifact.not_found", "Artifact not found", { id });
  return artifact;
}

/** Validates the progress against the artifact's own type before saving it. */
export async function saveArtifactProgressForUser(userId: string, id: string, progress: unknown) {
  const artifact = await getArtifact(id, userId);

  let parsed: object;
  switch (artifact.type) {
    case StudioArtifactType.QUESTION:
      parsed = questionProgressSchema.parse(progress);
      break;
    case StudioArtifactType.FLASHCARD:
      parsed = flashcardProgressSchema.parse(progress);
      break;
    default:
      throw new AppError("request.invalid", `Unknown artifact type: ${artifact.type}`);
  }

  await updateArtifactProgress(id, userId, parsed);
}
