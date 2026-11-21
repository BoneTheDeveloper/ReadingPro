/**
 * Step functions for artifact generation.
 */
import { generateAndStoreArtifact } from "../artifact-generator";
import { updateArtifactStatus } from "../artifact-repository";
import { AppError } from "@/server/lib/errors";
import type { StudioArtifactType } from "@/shared/enums";

export interface ArtifactGenerationInput {
  artifactId: string;
  userId: string;
  passageId: string;
  type: StudioArtifactType;
}

export async function generateArtifactStep(args: ArtifactGenerationInput) {
  "use step";
  await generateAndStoreArtifact({
    artifactId: args.artifactId,
    userId: args.userId,
    passageId: args.passageId,
    type: args.type,
  });
}

export async function failStep(args: ArtifactGenerationInput) {
  "use step";
  const artifact = await updateArtifactStatus({
    id: args.artifactId,
    userId: args.userId,
    status: "FAILED",
  });
  if (!artifact) {
    throw new AppError("artifact.not_found", "Artifact not found", { id: args.artifactId });
  }
}
