import { notFound } from 'next/navigation';
import { withUserContext } from '@/lib/db/client';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { ReadingViewClient } from './reading-view-client';

interface ReadingPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadingPage({ params }: ReadingPageProps) {
  const { id } = await params;
  const passageId = decodeURIComponent(id);
  const user = await getAuthenticatedUser();
  const userDb = withUserContext(user.id);

  const passage = await userDb.passage.findUnique({
    where: { id: passageId },
    include: { questions: true },
  });

  if (!passage) {
    notFound();
  }

  const displayContent = passage.simplifiedContent || passage.content;
  const displayLevel = passage.simplifiedLevel || passage.originalLevel || 'B2';

  return (
    <ReadingViewClient
      passage={{
        id: passage.id,
        title: passage.title,
        content: passage.content,
        simplifiedContent: passage.simplifiedContent,
        originalLevel: passage.originalLevel,
        simplifiedLevel: passage.simplifiedLevel,
        wordCount: passage.wordCount,
        displayContent,
        displayLevel,
        questionCount: passage.questions.length,
      }}
    />
  );
}
