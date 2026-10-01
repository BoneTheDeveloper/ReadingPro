import { Hono } from "hono";
import { z } from "zod";
import { validate } from "@/server/lib/validate";
import { requireSession } from "@/server/middleware/require-session";
import { CreatePassageInputSchema } from "@/shared/passage/schema";
import {
  deletePassageForUser,
  listPassagesForUser,
  requireReadyPassage,
  submitPassageForUser,
} from "./passage-service";
import type { AuthEnv } from "@/server/env";

const PassageIdParamSchema = z.object({ id: z.uuid() });

export const passageRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .get("/", async (c) => {
    return c.json(await listPassagesForUser(c.var.user.id));
  })
  .post("/", validate("json", CreatePassageInputSchema), async (c) => {
    // 202: the passage is saved as PENDING and processed in the background.
    return c.json(await submitPassageForUser(c.var.user.id, c.req.valid("json")), 202);
  })
  .get("/:id", validate("param", PassageIdParamSchema), async (c) => {
    return c.json(await requireReadyPassage(c.var.user.id, c.req.valid("param").id));
  })
  .delete("/:id", validate("param", PassageIdParamSchema), async (c) => {
    await deletePassageForUser(c.var.user.id, c.req.valid("param").id);
    return c.body(null, 204);
  });
