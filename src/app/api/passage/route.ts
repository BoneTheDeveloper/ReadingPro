import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { createPassageForUser, listPassagesForUser } from "@/features/passage/server/service/passage-crud";
import { preprocessPassage, prepareForAIProcessing } from "@/features/passage/server/service/passage-preprocessing";
import { processPassage } from "@/features/passage/server/service/passage-processing";
import { CreatePassageInputSchema } from "@/features/passage/schema";

export const GET = withErrorHandling("passages", async () => {
  const { user } = await requireApiSession();
  const passages = await listPassagesForUser(user.id);
  return Response.json(passages);
});

export const POST = withErrorHandling("create-passage", async (req) => {
  const { user } = await requireApiSession();
  const input = CreatePassageInputSchema.parse(await req.json());

  // ── Stage 1-4: Preprocess text (extract → clean → normalize → validate) ──
  const { normalized } = await preprocessPassage(input);

  // ── Stage 5: AI processing (clean + CEFR + title) ──────────────────────
  const { text: content, cefrLevel: aiCefrLevel, title } = await processPassage(
    prepareForAIProcessing(normalized),
    input.title,
  );

  const passage = await createPassageForUser({
    userId: user.id,
    title: title.slice(0, 200),
    content,
    sourceType: input.sourceType,
    cefrLevel: aiCefrLevel ?? undefined,
    youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
  });

  return Response.json(passage, { status: 201 });
});
