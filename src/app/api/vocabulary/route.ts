import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { storeVocabularyItemForUser } from "@/features/vocabulary/server/services/vocabulary-crud";
import { VocabularyInputSchema } from "@/features/vocabulary/schema";

/**
 * POST /api/vocabulary
 *
 * Persist a vocabulary item for the authenticated user. The Popup's "Lưu"
 * button in the reading feature fires this mutation after a translation
 * completes.
 */
export const POST = withErrorHandling("vocabulary", async (req) => {
  const { user } = await requireApiSession();
  const input = VocabularyInputSchema.parse(await req.json());
  const item = await storeVocabularyItemForUser(user.id, input);
  return Response.json(item, { status: 201 });
});