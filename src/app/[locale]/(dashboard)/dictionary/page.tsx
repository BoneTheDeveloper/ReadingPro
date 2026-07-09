import { getUserId } from "@/lib/auth-server";
import { DictionaryPageClient } from "@/features/dictionary/ui/dictionary-page";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  // Auth gate - middleware handles redirect
  await getUserId();
  return <DictionaryPageClient />;
}
