import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { requireSession } from "@/server/modules/auth/require-session";
import {
  deleteVocabularyItemForUser,
  listVocabularyItemsForUser,
  listVocabularyStatsForUser,
  storeVocabularyItemForUser,
  updateVocabularyItemForUser,
} from "./vocabulary-crud";
import {
  VocabularyIdParamSchema,
  VocabularyInputSchema,
  VocabularyUpdateInputSchema,
} from "@/shared/vocabulary/schema";
import type { AuthEnv } from "@/server/env";

export const vocabularyRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .get("/", async (c) => {
    return c.json(await listVocabularyItemsForUser(c.var.user.id));
  })
  .post("/", validate("json", VocabularyInputSchema), async (c) => {
    const item = await storeVocabularyItemForUser(c.var.user.id, c.req.valid("json"));
    return c.json(item, 201);
  })
  .get("/stats", async (c) => {
    return c.json(await listVocabularyStatsForUser(c.var.user.id));
  })
  .patch(
    "/:id",
    validate("param", VocabularyIdParamSchema),
    validate("json", VocabularyUpdateInputSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      const updated = await updateVocabularyItemForUser(c.var.user.id, id, c.req.valid("json"));
      return c.json(updated);
    },
  )
  .delete("/:id", validate("param", VocabularyIdParamSchema), async (c) => {
    await deleteVocabularyItemForUser(c.var.user.id, c.req.valid("param").id);
    return c.body(null, 204);
  });
