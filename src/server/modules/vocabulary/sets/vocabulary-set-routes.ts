import { Hono } from "hono";
import { validate } from "@/server/lib/validate";
import { requireSession } from "@/server/modules/auth/require-session";
import {
  addVocabularySetItemsForUser,
  createVocabularySetForUser,
  deleteVocabularySetForUser,
  generateVocabularySetForUser,
  getVocabularySetForUser,
  listVocabularySetsForUser,
  removeVocabularySetItemForUser,
  updateVocabularySetForUser,
} from "./vocabulary-set-service";
import {
  VocabularySetCreateInputSchema,
  VocabularySetGenerateInputSchema,
  VocabularySetIdParamSchema,
  VocabularySetItemParamSchema,
  VocabularySetItemsInputSchema,
  VocabularySetUpdateInputSchema,
} from "@/shared/vocabulary/set-schema";
import type { AuthEnv } from "@/server/env";

export const vocabularySetRoutes = new Hono<AuthEnv>()
  .use(requireSession)
  .get("/", async (c) => {
    return c.json(await listVocabularySetsForUser(c.var.user.id));
  })
  .post("/", validate("json", VocabularySetCreateInputSchema), async (c) => {
    const set = await createVocabularySetForUser(c.var.user.id, c.req.valid("json"));
    return c.json(set, 201);
  })
  // Before "/:id" so "generate" is never read as a set id.
  .post("/generate", validate("json", VocabularySetGenerateInputSchema), async (c) => {
    const set = await generateVocabularySetForUser(c.var.user, c.req.valid("json"));
    return c.json(set, 201);
  })
  .get("/:id", validate("param", VocabularySetIdParamSchema), async (c) => {
    return c.json(await getVocabularySetForUser(c.var.user.id, c.req.valid("param").id));
  })
  .patch(
    "/:id",
    validate("param", VocabularySetIdParamSchema),
    validate("json", VocabularySetUpdateInputSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      return c.json(await updateVocabularySetForUser(c.var.user.id, id, c.req.valid("json")));
    },
  )
  .delete("/:id", validate("param", VocabularySetIdParamSchema), async (c) => {
    await deleteVocabularySetForUser(c.var.user.id, c.req.valid("param").id);
    return c.body(null, 204);
  })
  .put(
    "/:id/items",
    validate("param", VocabularySetIdParamSchema),
    validate("json", VocabularySetItemsInputSchema),
    async (c) => {
      const { id } = c.req.valid("param");
      await addVocabularySetItemsForUser(c.var.user.id, id, c.req.valid("json").itemIds);
      return c.body(null, 204);
    },
  )
  .delete("/:id/items/:itemId", validate("param", VocabularySetItemParamSchema), async (c) => {
    const { id, itemId } = c.req.valid("param");
    await removeVocabularySetItemForUser(c.var.user.id, id, itemId);
    return c.body(null, 204);
  });
