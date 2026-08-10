import "server-only";
import { after } from "next/server";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { StudioArtifactType } from "@/generated/prisma/enums";
import z from "zod";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import { createArtifact, updateArtifactStatus } from "@/features/studio/server/service/artifact-crud";
import { generateAndStoreArtifact } from "@/features/studio/server/service/artifact-generator";
import { AppError } from "@/lib/error/app-error";
import { log } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

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

  after(async () => {
    try {
      await generateAndStoreArtifact({
        artifactId: artifact.id,
        userId: user.id,
        passageId,
        type: StudioArtifactType.QUESTION,
      });
    } catch (err) {
      log.error({ err, passageId: passage.id, userId: user.id }, "question genarated failed");
      Sentry.captureException(err, { tags: { passageId: passage.id } });
      await updateArtifactStatus({ id: artifact.id, userId: user.id, status: "FAILED" });
    }
  })

  return Response.json({ artifact }, { status: 201 });
});
