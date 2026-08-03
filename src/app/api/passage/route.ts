import { after } from "next/server";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { createPassageForUser, listPassagesForUser, deletePassageForUser } from "@/features/passage/server/service/passage-crud";
import { preprocessPassage, prepareForAIProcessing } from "@/features/passage/server/service/passage-preprocessing";
import { runPassageProcessing } from "@/features/passage/server/service/passage-processing";
import { CreatePassageInputSchema } from "@/features/passage/schema";
import { log } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
export const GET = withErrorHandling("passages", async () => {
  const { user } = await requireApiSession();
  const passages = await listPassagesForUser(user.id);
  return Response.json(passages);
});


export const maxDuration = 200;

export const POST = withErrorHandling("create-passage", async (req) => {
  const { user } = await requireApiSession();
  const input = CreatePassageInputSchema.parse(await req.json());

  const { normalized } = await preprocessPassage(input);

  const cleanedForAI = prepareForAIProcessing(normalized);

  const passage = await createPassageForUser({
    userId: user.id,
    title: input.title.slice(0, 200),
    content: cleanedForAI,
    sourceType: input.sourceType,
    youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
    status: "PENDING",
  });

  after(async () => {
    try {
      await runPassageProcessing({ userId: user.id, passageId: passage.id, cleanedText: cleanedForAI, userTitle: input.title });
    } catch (err) {
      log.error({ err, passageId: passage.id, userId: user.id }, "passage-processing failed");
      Sentry.captureException(err, { tags: { passageId: passage.id } });
      await deletePassageForUser(passage.id, user.id);
    }
  })
  return Response.json(passage, { status: 201 });
});
