import { withErrorHandling } from "@/lib/error/with-error-handling";
import { requireApiSession } from "@/lib/auth/session";
import { listVocabularyStatsForUser } from "@/features/vocabulary/server/services/vocabulary-crud";

export const GET = withErrorHandling("vocabulary/stats", async () => {
  const { user } = await requireApiSession();
  return Response.json(await listVocabularyStatsForUser(user.id));
});