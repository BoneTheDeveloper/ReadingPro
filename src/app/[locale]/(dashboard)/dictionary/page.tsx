import { getAuthenticatedUser } from "@/lib/auth/auth-utils";
import { DictionaryPageClient } from "@/features/dictionary/ui/dictionary-page-client";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  await getAuthenticatedUser();
  return <DictionaryPageClient />;
}
