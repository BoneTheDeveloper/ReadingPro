import { getUserId } from "@/lib/auth/auth-server";
import { getUserPassages } from "@/features/passage/db/passage.repository";
import { StudyPageClient } from "./_components/study-workspace";
import type { PassageData } from "@/types/passage";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const userId = await getUserId();
  const rows = await getUserPassages(userId);

  const initialPassages: PassageData[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    cefrLevel: p.cefrLevel,
    wordCount: p.wordCount,
    createdAt: p.createdAt.getTime(),
    sourceType: p.sourceType,
  }));

  return <StudyPageClient initialPassages={initialPassages} />;
}
