import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { requireSession } from "@/server/modules/auth/require-session";
import {
  createPassageForUser,
  deletePassageForUser,
  findPassageForUser,
  listPassagesForUser,
} from "./passage-crud";
import { CreatePassageInputSchema } from "@/shared/passage/schema";
import { start } from "workflow/api";
import { passageProcessingWorkflow } from "./workflow/index";
import { extractVideoId } from "@/shared/passage/youtube-url";
import { fetchTranscript } from "./youtube-transcript";
import { AppError } from "@/server/lib/errors";
import { z } from "zod";
import type { AuthEnv } from "@/server/env";

const PassageIdParamSchema = z.object({ id: z.uuid() });

export const passageRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .get("/", async (c) => {
    const passages = await listPassagesForUser(c.var.user.id);
    return c.json(passages);
  })
  .post("/", validate("json", CreatePassageInputSchema), async (c) => {
    const { user } = c.var;
    const input = c.req.valid("json");

    // Early YouTube validation - fail fast if no transcript
    if (input.sourceType === "YOUTUBE") {
      const videoId = extractVideoId(input.youtubeUrl);
      if (!videoId) throw new AppError("youtube.url_invalid", "YouTube URL is invalid");
      const transcript = await fetchTranscript(videoId);
      if (!transcript) throw new AppError("youtube.no_transcript", "Video has no transcript");
    }

    // Create passage with PENDING status
    const passage = await createPassageForUser({
      userId: user.id,
      sourceType: input.sourceType,
      youtubeUrl: input.sourceType === "YOUTUBE" ? input.youtubeUrl : null,
    });

    // Trigger durable workflow
    await start(passageProcessingWorkflow, [{
      passageId: passage.id,
      input,
      userId: user.id,
    }]);

    // Return 202 Accepted immediately
    return c.json(passage, 202);
  })
  .get("/:id", validate("param", PassageIdParamSchema), async (c) => {
    const { id } = c.req.valid("param");
    const passage = await findPassageForUser(c.var.user.id, id);
    if (!passage || passage.status !== "COMPLETED") {
      throw new AppError("passage.not_ready", "Passage is not ready");
    }

    return c.json(passage);
  })
  .delete("/:id", validate("param", PassageIdParamSchema), async (c) => {
    await deletePassageForUser(c.var.user.id, c.req.valid("param").id);
    return c.body(null, 204);
  });
