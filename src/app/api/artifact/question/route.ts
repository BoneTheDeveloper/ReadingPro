import "server-only";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { StudioArtifactType } from "@/generated/prisma/enums";
import z from "zod";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import { createArtifact } from "@/features/studio/server/service/artifact-crud";
import { AppError } from "@/lib/error/app-error";
import { start } from "workflow/api";
import { artifactGenerationWorkflow } from "@/workflows/artifact-generation/index";

export const POST = withErrorHandling("create-question", async (request) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { passageId } = z.object({ passageId: z.uuid() }).parse(await request.json());

  const passage = await findPassageForUser(user.id, passageId);
  // Content is empty until processing completes — generating from it would
  // feed the model an empty passage.
  if (!passage || passage.status !== "COMPLETED") {
    throw new AppError(404, "NOT_FOUND", "Passage is not ready");
  }

  const artifact = await createArtifact({
    passageId,
    userId: user.id,
    type: StudioArtifactType.QUESTION,
    status: "PENDING",
  });

  await start(artifactGenerationWorkflow, [{
    artifactId: artifact.id,
    userId: user.id,
    passageId,
    type: StudioArtifactType.QUESTION,
  }]);

  return Response.json({ artifact }, { status: 201 });
});
