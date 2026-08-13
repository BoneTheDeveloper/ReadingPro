import { after } from "next/server";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { createPassageForUser, listPassagesForUser, failPassageProcessing } from "@/features/passage/server/service/passage-crud";
import { preprocessPassage } from "@/features/passage/server/service/passage-preprocessing";
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


export const maxDuration = 300;

export const POST = withErrorHandling("create-passage", async (req) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const input = CreatePassageInputSchema.parse(await req.json());

  const { normalized } = await preprocessPassage(input);

  const passage = await createPassageForUser({
    userId: user.id,
    sourceType: input.sourceType,
    youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
  });

  after(async () => {
    try {
      const { metadataError, contentError } = await runPassageProcessing({
        userId: user.id,
        passageId: passage.id,
        normalizedText: normalized,
        userTitle: input.title,
      });

      // A degraded pass still stored a readable passage, so this is a warning
      // rather than a failure — and it is the only signal that the AI is
      // timing out on long passages.
      if (metadataError || contentError) {
        log.warn(
          { metadataError, contentError, passageId: passage.id, userId: user.id },
          "passage-processing degraded",
        );
        Sentry.captureException(contentError ?? metadataError, {
          tags: { passageId: passage.id },
        });
      }
    } catch (err) {
      log.error({ err, passageId: passage.id, userId: user.id }, "passage-processing failed");
      Sentry.captureException(err, { tags: { passageId: passage.id } });
      await failPassageProcessing({ userId: user.id, passageId: passage.id });
    }
  })
  return Response.json(passage, { status: 201 });
});
