import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { requireSession } from "@/server/middleware/require-session";
import {
  WordLookupIdParamSchema,
  WordLookupInputSchema,
  WordLookupListQuerySchema,
} from "@/shared/dictionary/schema";
import {
  deleteLookupForUser,
  getLookupForUser,
  listLookupsForUser,
  lookUpWordForUser,
} from "./word-lookup-service";
import type { AuthEnv } from "@/server/env";

export const wordLookupRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .post("/", validate("json", WordLookupInputSchema), async (c) => {
    return c.json(await lookUpWordForUser(c.var.user.id, c.req.valid("json")), 201);
  })
  .get("/", validate("query", WordLookupListQuerySchema), async (c) => {
    return c.json(await listLookupsForUser(c.var.user.id, c.req.valid("query").passageId));
  })
  .get("/:id", validate("param", WordLookupIdParamSchema), async (c) => {
    return c.json(await getLookupForUser(c.var.user.id, c.req.valid("param").id));
  })
  .delete("/:id", validate("param", WordLookupIdParamSchema), async (c) => {
    await deleteLookupForUser(c.var.user.id, c.req.valid("param").id);
    return c.body(null, 204);
  });
