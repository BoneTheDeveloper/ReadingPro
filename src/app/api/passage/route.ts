import { after } from "next/server";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { createPassageForUser, listPassagesForUser } from "@/features/passage/server/service/passage-crud";
import { preprocessPassage, prepareForAIProcessing } from "@/features/passage/server/service/passage-preprocessing";
import { runPassageProcessing } from "@/features/passage/server/service/passage-processing";
import { CreatePassageInputSchema } from "@/features/passage/schema";

export const GET = withErrorHandling("passages", async () => {
  const { user } = await requireApiSession();
  const passages = await listPassagesForUser(user.id);
  return Response.json(passages);
});


export const maxDuration = 300;

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

  after(() => {
    // Run in the background; never let a throw surface as an unhandled
    // rejection that crashes the route lifecycle. Surface failures to the
    // server log so the operator sees them — the row stays PENDING until
    // a future processing attempt (or manual intervention) succeeds.
    void runPassageProcessing({
      userId: user.id,
      passageId: passage.id,
      cleanedText: cleanedForAI,
      userTitle: input.title,
    }).catch((err) => {
      console.error("[passage-processing] failed", {
        passageId: passage.id,
        userId: user.id,
        err,
      });
    });
  });

  return Response.json(passage, { status: 201 });
});
