import { getAuthenticatedUser } from "@/server/auth/auth-utils";
import { VocabularyPageClient } from "@/features/vocabulary/ui/vocabulary-page-client";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  // Auth gate — redirects to sign-in if unauthenticated
  await getAuthenticatedUser();

  return <VocabularyPageClient />;
}
