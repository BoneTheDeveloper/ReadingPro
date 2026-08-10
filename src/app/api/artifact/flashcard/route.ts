import "server-only";
import { after } from "next/server";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { StudioArtifactType } from "@/generated/prisma/enums";
import z from "zod";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import { createArtifact, deleteArtifact } from "@/features/studio/server/service/artifact-crud";
import { generateAndStoreArtifact } from "@/features/studio/server/service/artifact-generator";
import { AppError } from "@/lib/error/app-error";
import { log } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

export const POST = withErrorHandling("create-flashcard", async (request) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { passageId } = z.object({ passageId: z.uuid() }).parse(await request.json());

  const passage = await findPassageForUser(user.id, passageId);
  if (!passage) throw new AppError(404, "NOT_FOUND", "Passage not found");

  const artifact = await createArtifact({
    passageId,
    userId: user.id,
    type: StudioArtifactType.FLASHCARD,
    status: "PENDING",
  });

  after(async () => {
    try {
      await generateAndStoreArtifact({
        artifactId: artifact.id,
        userId: user.id,
        passageId,
        type: StudioArtifactType.FLASHCARD,
      });
    } catch (err) {
      log.error({ err, passageId: passage.id, userId: user.id }, "flashcard generation failed");
      Sentry.captureException(err, { tags: { passageId: passage.id } });
      await deleteArtifact(artifact.id, user.id);
    }
  });

  return Response.json({ artifact }, { status: 201 });
});
