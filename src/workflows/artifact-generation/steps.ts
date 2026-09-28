/**
 * Step functions for artifact generation.
 */
import { generateAndStoreArtifact } from "@/server/services/studio/artifact-generator";
import { updateArtifactStatus } from "@/server/services/studio/artifact-crud";
import { StudioArtifactType } from "@/generated/prisma/enums";

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
  await updateArtifactStatus({
    id: args.artifactId,
    userId: args.userId,
    status: "FAILED",
  });
}
