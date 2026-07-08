import { auth } from "@clerk/nextjs/server";
import { DictionaryPageClient } from "@/features/dictionary/ui/dictionary-page";

export const dynamic = "force-dynamic";

export default async function DictionaryPage() {
  // Authoritative auth gate — redirects to sign-in if unauthenticated.
  await auth.protect();
  return <DictionaryPageClient />;
}
