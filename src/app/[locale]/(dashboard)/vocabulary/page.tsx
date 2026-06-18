import { getPageUserId } from "@/server/auth/auth-utils";
import { VocabularyPageClient } from "@/features/vocabulary/ui/vocabulary-page-client";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  // Authoritative auth gate — redirects to sign-in if unauthenticated.
  // Not delegated to middleware alone (optimistic only; cf. CVE-2025-29927).
  await getPageUserId();

  return <VocabularyPageClient />;
}
