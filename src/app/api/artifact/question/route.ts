import "server-only";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { StudioArtifactType } from "@/generated/prisma/enums";
import z from "zod"
import { findPassageForUser } from "@/features/passage/server/service/passage-crud";
import { createArtifact } from "@/features/studio/server/service/artifact-crud";
import { generateComprehensionQuestions } from "@/features/studio/server/service/question-generator";
import { AppError } from "@/lib/error/app-error";

export const POST = withErrorHandling("create-question", async (request) => {
  const { user } = await requireApiSession();
  const { passageId } = z.object({ passageId: z.uuid() }).parse(await request.json);

  // ── 1. Get passage ───────────────────────────────────────────
  const passage = await findPassageForUser(user.id, passageId);
  if (!passage) throw new AppError(404, "NOT_FOUND", "Passage not found");

  // ── 2. AI generate questions ────────────────────────────────
  const content = await generateComprehensionQuestions(passage.content, 5);

  // ── 3. Persist artifact ────────────────────────────────────
  const artifact = await createArtifact({
    passageId,
    userId: user.id,
    type: StudioArtifactType.QUESTION,
    content,
  });

  return Response.json({ artifact, content }, { status: 201 });
});
