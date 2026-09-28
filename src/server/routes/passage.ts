import { Hono } from "hono";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import {
  createPassageForUser,
  deletePassageForUser,
  findPassageForUser,
  listPassagesForUser,
} from "@/server/services/passage/passage-crud";
import { CreatePassageInputSchema } from "@/features/passage/schema";
import { start } from "workflow/api";
import { passageProcessingWorkflow } from "@/workflows/passage-processing/index";
import { fetchTranscript, extractVideoId } from "@/features/passage/util/youtube-helper";
import { YOUTUBE_ERRORS } from "@/features/passage/util/upload-config";
import { AppError } from "@/lib/error/app-error";
import { z } from "zod";

export const passageRoutes = new Hono();

passageRoutes.get("/", withErrorHandling("passages", async (req) => {
  const auth = await requireApiSession(req);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const passages = await listPassagesForUser(user.id);
  return Response.json(passages);
}));

passageRoutes.post("/", withErrorHandling("create-passage", async (req) => {
  const auth = await requireApiSession(req);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;

  // 1. Validate input
  const input = CreatePassageInputSchema.parse(await req.json());

  // 2. Early YouTube validation - fail fast if no transcript
  if (input.sourceType === "YOUTUBE") {
    const videoId = extractVideoId(input.youtubeUrl);
    if (!videoId) {
      return Response.json(
        { error: { code: "VALIDATION", message: YOUTUBE_ERRORS.URL_INVALID } },
        { status: 400 }
      );
    }
    const transcript = await fetchTranscript(videoId);
    if (!transcript) {
      return Response.json(
        { error: { code: "VALIDATION", message: YOUTUBE_ERRORS.NO_TRANSCRIPT } },
        { status: 400 }
      );
    }
  }

  // 3. Create passage with PENDING status
  const passage = await createPassageForUser({
    userId: user.id,
    sourceType: input.sourceType,
    youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
  });

  // 4. Trigger durable workflow
  await start(passageProcessingWorkflow, [{
    passageId: passage.id,
    input,
    userId: user.id,
  }]);

  // 5. Return 202 Accepted immediately
  return Response.json(passage, { status: 202 });
}));

passageRoutes.get("/:id", withErrorHandling("passages/[id]", async (req, { params }) => {
  const auth = await requireApiSession(req);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  const passage = await findPassageForUser(user.id, id);
  if (!passage || passage.status !== "COMPLETED") {
    throw new AppError(404, "NOT_FOUND", "Passage is not ready");
  }

  return Response.json(passage);
}));

passageRoutes.delete("/:id", withErrorHandling("passages/[id]", async (req, { params }) => {
  const auth = await requireApiSession(req);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const { id } = z.object({ id: z.uuid() }).parse(await params);
  await deletePassageForUser(user.id, id);
  return new Response(null, { status: 204 });
}));
