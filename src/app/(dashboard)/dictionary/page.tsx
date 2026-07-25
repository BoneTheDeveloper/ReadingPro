import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DictionaryPageClient } from "@/features/dictionary/components/dictionary-page";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return <DictionaryPageClient />;
}