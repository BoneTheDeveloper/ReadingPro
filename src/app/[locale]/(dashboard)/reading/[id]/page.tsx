import { notFound } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { ReadingViewClient } from '@/features/reading/ui/reading-view-client';
import { getReadingPassageForUser } from '@/lib/study/passage/reading-passage-service';

interface ReadingPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReadingPage({ params }: ReadingPageProps) {
  const { id } = await params;
  const passageId = decodeURIComponent(id);
  const user = await getAuthenticatedUser();

  const passage = await getReadingPassageForUser(user.id, passageId);

  if (!passage) {
    notFound();
  }

  return <ReadingViewClient passage={passage} />;
}
