import { start } from "workflow/api";
import { AppError } from "@/server/lib/errors";
import { StudioArtifactType } from "@/shared/enums";
import { requireReadyPassage } from "@/server/modules/passage";
import { flashcardProgressSchema, questionProgressSchema } from "@/shared/studio/artifact";
import {
  createArtifact,
  deleteArtifact as deleteArtifactRow,
  findArtifactForUser,
  updateArtifactProgress,
  type ArtifactDetailRow,
} from "./artifact-repository";
import { artifactGenerationWorkflow } from "./workflow/index";

export { listArtifactsForUser } from "./artifact-repository";

async function getArtifact(id: string, userId: string): Promise<ArtifactDetailRow> {
  const artifact = await findArtifactForUser(id, userId);
  if (!artifact) throw new AppError("artifact.not_found", "Artifact not found", { id });
  return artifact;
}

export async function deleteArtifact(id: string, userId: string): Promise<void> {
  const deleted = await deleteArtifactRow(id, userId);
  if (!deleted) throw new AppError("artifact.not_found", "Artifact not found", { id });
}

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

  const updated = await updateArtifactProgress(id, userId, parsed);
  if (!updated) throw new AppError("artifact.not_found", "Artifact not found", { id });
}
