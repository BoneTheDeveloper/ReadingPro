import { getPageUserId } from "@/services/clerk";
import { DictionaryPageClient } from "@/features/dictionary/ui/dictionary-page-client";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  await getPageUserId();
  return <DictionaryPageClient />;
}
