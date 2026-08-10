import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import {
  listVocabularyItemsForUser,
  storeVocabularyItemForUser,
} from "@/features/vocabulary/server/services/vocabulary-crud";
import { VocabularyInputSchema } from "@/features/vocabulary/schema";

export const GET = withErrorHandling("vocabulary", async () => {
  const { user } = await requireApiSession();
  return Response.json(await listVocabularyItemsForUser(user.id));
});

export const POST = withErrorHandling("vocabulary", async (req) => {
  const { user } = await requireApiSession();
  const input = VocabularyInputSchema.parse(await req.json());
  const item = await storeVocabularyItemForUser(user.id, input);
  return Response.json(item, { status: 201 });
});
