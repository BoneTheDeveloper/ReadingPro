import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import {
  deleteVocabularyItemForUser,
  updateVocabularyItemForUser,
} from "@/features/vocabulary/server/services/vocabulary-crud";
import {
  VocabularyIdParamSchema,
  VocabularyUpdateInputSchema,
} from "@/features/vocabulary/schema";

export const PATCH = withErrorHandling(
  "vocabulary/[id]",
  async (req, { params }) => {
    const { user } = await requireApiSession();
    const { id } = VocabularyIdParamSchema.parse(await params);
    const input = VocabularyUpdateInputSchema.parse(await req.json());
    const updated = await updateVocabularyItemForUser(user.id, id, input);
    return Response.json(updated);
  },
);

export const DELETE = withErrorHandling(
  "vocabulary/[id]",
  async (_req, { params }) => {
    const { user } = await requireApiSession();
    const { id } = VocabularyIdParamSchema.parse(await params);
    await deleteVocabularyItemForUser(user.id, id);
    return new Response(null, { status: 204 });
  },
);