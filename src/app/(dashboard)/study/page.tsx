import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { getUserPassages } from '@/lib/db/passage-queries';
import { StudyPageClient } from '@/features/study/study-page-client';
import type { PassageData } from '@/features/study/study-types';

export const dynamic = 'force-dynamic';

export default async function StudyPage() {
  const user = await getAuthenticatedUser();
  const rows = await getUserPassages(user.id);

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
