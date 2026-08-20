import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { createPassageForUser, listPassagesForUser } from "@/features/passage/server/service/passage-crud";
import { CreatePassageInputSchema } from "@/features/passage/schema";
import { start } from "workflow/api";
import { passageProcessingWorkflow } from "@/workflows/passage-processing/index";
export const GET = withErrorHandling("passages", async () => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const passages = await listPassagesForUser(user.id);
  return Response.json(passages);
});


export const POST = withErrorHandling("create-passage", async (req) => {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { user } = auth.session;

  // 1. Validate input
  const input = CreatePassageInputSchema.parse(await req.json());

  // 2. Create passage with PENDING status
  const passage = await createPassageForUser({
    userId: user.id,
    sourceType: input.sourceType,
    youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
  });

  // 3. Trigger durable workflow
  await start(passageProcessingWorkflow, [{
    passageId: passage.id,
    input,
    userId: user.id,
  }]);

  // 4. Return 202 Accepted immediately
  return Response.json(passage, { status: 202 });
});
