import { getUserId } from "@/lib/auth/auth-server";
import { DictionaryPageClient } from "@/features/dictionary/components/dictionary-page";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  // Auth gate - middleware handles redirect
  await getUserId();
  return <DictionaryPageClient />;
}
