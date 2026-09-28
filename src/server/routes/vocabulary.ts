import { Hono } from "hono";
import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import {
  deleteVocabularyItemForUser,
  listVocabularyItemsForUser,
  listVocabularyStatsForUser,
  storeVocabularyItemForUser,
  updateVocabularyItemForUser,
} from "@/server/services/vocabulary/vocabulary-crud";
import {
  VocabularyIdParamSchema,
  VocabularyInputSchema,
  VocabularyUpdateInputSchema,
} from "@/features/vocabulary/schema";

export const vocabularyRoutes = new Hono();

vocabularyRoutes.get("/", withErrorHandling("vocabulary", async (req) => {
  const auth = await requireApiSession(req);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  return Response.json(await listVocabularyItemsForUser(user.id));
}));

vocabularyRoutes.post("/", withErrorHandling("vocabulary", async (req) => {
  const auth = await requireApiSession(req);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  const input = VocabularyInputSchema.parse(await req.json());
  const item = await storeVocabularyItemForUser(user.id, input);
  return Response.json(item, { status: 201 });
}));

vocabularyRoutes.get("/stats", withErrorHandling("vocabulary/stats", async (req) => {
  const auth = await requireApiSession(req);
  if (!auth.ok) return auth.response;
  const { user } = auth.session;
  return Response.json(await listVocabularyStatsForUser(user.id));
}));

vocabularyRoutes.patch(
  "/:id",
  withErrorHandling("vocabulary/[id]", async (req, { params }) => {
    const auth = await requireApiSession(req);
    if (!auth.ok) return auth.response;
    const { user } = auth.session;
    const { id } = VocabularyIdParamSchema.parse(await params);
    const input = VocabularyUpdateInputSchema.parse(await req.json());
    const updated = await updateVocabularyItemForUser(user.id, id, input);
    return Response.json(updated);
  }),
);

vocabularyRoutes.delete(
  "/:id",
  withErrorHandling("vocabulary/[id]", async (req, { params }) => {
    const auth = await requireApiSession(req);
    if (!auth.ok) return auth.response;
    const { user } = auth.session;
    const { id } = VocabularyIdParamSchema.parse(await params);
    await deleteVocabularyItemForUser(user.id, id);
    return new Response(null, { status: 204 });
  }),
);
