import { after } from "next/server";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { createPassageForUser, listPassagesForUser, failPassageProcessing } from "@/features/passage/server/service/passage-crud";
import { preprocessPassage, prepareForAIProcessing } from "@/features/passage/server/service/passage-preprocessing";
import { runPassageProcessing } from "@/features/passage/server/service/passage-processing";
import { CreatePassageInputSchema } from "@/features/passage/schema";
import { log } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";
export const GET = withErrorHandling("passages", async () => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const passages = await listPassagesForUser(user.id);
  return Response.json(passages);
});


export const maxDuration = 200;

export const POST = withErrorHandling("create-passage", async (req) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const input = CreatePassageInputSchema.parse(await req.json());

  const { normalized } = await preprocessPassage(input);

  const cleanedForAI = prepareForAIProcessing(normalized);

  const passage = await createPassageForUser({
    userId: user.id,
    sourceType: input.sourceType,
    youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
  });

  after(async () => {
    try {
      await runPassageProcessing({ userId: user.id, passageId: passage.id, cleanedText: cleanedForAI, userTitle: input.title });
    } catch (err) {
      log.error({ err, passageId: passage.id, userId: user.id }, "passage-processing failed");
      Sentry.captureException(err, { tags: { passageId: passage.id } });
      await failPassageProcessing({ userId: user.id, passageId: passage.id });
    }
  })
  return Response.json(passage, { status: 201 });
});
