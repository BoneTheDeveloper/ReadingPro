import { Hono } from "hono";
import { z } from "zod";
import { validate } from "@/server/lib/validate";
import { AppError } from "@/server/lib/errors";
import { requireSession } from "@/server/modules/auth/require-session";
import { StudioArtifactType } from "@/server/db/generated/enums";
import {
  deleteArtifact,
  getCompletedArtifactForUser,
  listArtifactsForUser,
  requestArtifactForUser,
  saveArtifactProgressForUser,
} from "./artifact-service";
import type { AuthEnv } from "@/server/env";

const ArtifactIdParamSchema = z.object({ id: z.uuid() });
const CreateArtifactInputSchema = z.object({ passageId: z.uuid() });

export const artifactRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .get("/", async (c) => {
    const passageId = c.req.query("passageId");
    if (!passageId) throw new AppError("request.invalid", "passageId is required");

    return c.json(await listArtifactsForUser(c.var.user.id, passageId));
  })
  .post("/flashcard", validate("json", CreateArtifactInputSchema), async (c) => {
    const { passageId } = c.req.valid("json");
    const artifact = await requestArtifactForUser(c.var.user.id, passageId, StudioArtifactType.FLASHCARD);
    return c.json({ artifact }, 201);
  })
  .post("/question", validate("json", CreateArtifactInputSchema), async (c) => {
    const { passageId } = c.req.valid("json");
    const artifact = await requestArtifactForUser(c.var.user.id, passageId, StudioArtifactType.QUESTION);
    return c.json({ artifact }, 201);
  })
  .get("/:id", validate("param", ArtifactIdParamSchema), async (c) => {
    return c.json(await getCompletedArtifactForUser(c.var.user.id, c.req.valid("param").id));
  })
  .delete("/:id", validate("param", ArtifactIdParamSchema), async (c) => {
    await deleteArtifact(c.req.valid("param").id, c.var.user.id);
    return c.body(null, 204);
  })
  .patch("/:id/progress", validate("param", ArtifactIdParamSchema), async (c) => {
    const body = await c.req.json();
    await saveArtifactProgressForUser(c.var.user.id, c.req.valid("param").id, body.progress);
    return c.json({ success: true });
  });
