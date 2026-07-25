import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { DictionaryPageClient } from "@/features/dictionary/components/dictionary-page";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <DictionaryPageClient />;
}