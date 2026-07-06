import { getPageUserId } from "@/server/auth/auth-utils";
import { getUserPassages } from "@/features/passage/db/passage-queries";
import { StudyPageClient } from "@/features/study-workspace/ui/study-workspace-client";
import type { PassageData } from "@/features/study/shared/types";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const userId = await getPageUserId();
  const rows = await getUserPassages(userId);

  const initialPassages: PassageData[] = rows.map((p) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    simplifiedContent: p.simplifiedContent,
    originalLevel: p.originalLevel,
    simplifiedLevel: p.simplifiedLevel,
    wordCount: p.wordCount,
    createdAt: p.createdAt.getTime(),
    sourceType: p.sourceType,
  }));

  return <StudyPageClient initialPassages={initialPassages} />;
}
