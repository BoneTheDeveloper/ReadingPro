import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import {
  listVocabularyItemsForUser,
  storeVocabularyItemForUser,
} from "@/features/vocabulary/server/services/vocabulary-crud";
import { VocabularyInputSchema } from "@/features/vocabulary/schema";

/**
 * GET /api/vocabulary
 *
 * Returns the authenticated user's saved vocabulary items, newest first.
 * The vocabulary page consumes this list to render the table.
 */
export const GET = withErrorHandling("vocabulary", async () => {
  const { user } = await requireApiSession();
  const items = await listVocabularyItemsForUser(user.id);
  return Response.json(items);
});

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