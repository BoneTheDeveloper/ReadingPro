import "server-only";
import { after } from "next/server";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { StudioArtifactType } from "@/generated/prisma/enums";
import z from "zod";
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import { createArtifact } from "@/features/studio/server/service/artifact-crud";
import { generateAndStoreArtifact } from "@/features/studio/server/service/question-generator";
import { AppError } from "@/lib/error/app-error";

export const maxDuration = 40;

export const POST = withErrorHandling("create-question", async (request) => {
  const { user } = await requireApiSession();
  const { passageId } = z.object({ passageId: z.uuid() }).parse(await request.json());

  const passage = await findPassageForUser(user.id, passageId);
  if (!passage) throw new AppError(404, "NOT_FOUND", "Passage not found");

  const artifact = await createArtifact({
    passageId,
    userId: user.id,
    type: StudioArtifactType.QUESTION,
    status: "PENDING",
  });

  after(() => {
    // Run in the background; never let a throw surface as an unhandled
    // rejection. Surface failures to the server log so the operator sees
    // them — the artifact stays PENDING until a future attempt succeeds.
    void generateAndStoreArtifact({
      artifactId: artifact.id,
      userId: user.id,
      passageId,
    }).catch((err) => {
      console.error("[artifact-generation] failed", {
        artifactId: artifact.id,
        passageId,
        userId: user.id,
        err,
      });
    });
  });

  return Response.json({ artifact }, { status: 201 });
});
