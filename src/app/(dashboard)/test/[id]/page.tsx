import { notFound } from 'next/navigation';
import { db } from '@/lib/db/client';
import { getAuthenticatedUser } from '@/lib/auth/auth-utils';
import { FlashcardTestClient } from './flashcard-test-client';

interface TestPageProps {
  params: Promise<{ id: string }>;
}

export default async function TestPage({ params }: TestPageProps) {
  const { id } = await params;
  const passageId = decodeURIComponent(id);
  const user = await getAuthenticatedUser();

  const passage = await db.passage.findUnique({
    where: { id: passageId, userId: user.id },
    include: { questions: true },
  });

  if (!passage || passage.questions.length === 0) {
    notFound();
  }

  const displayContent = passage.simplifiedContent || passage.content;

  const questions = passage.questions.map((q, i) => {
    let parsedOptions: Array<{ id: string; text: string }> = [];
    try {
      parsedOptions = JSON.parse(q.options as string);
    } catch {
      parsedOptions = [];
    }

    return {
      id: q.id,
      number: i + 1,
      questionText: q.questionText,
      options: parsedOptions,
      correctAnswer: q.correctOption,
      explanation: q.explanation,
      sourceText: q.sourceText,
      sourceLine: q.sourceLine,
      questionType: q.questionType,
      difficulty: q.difficulty,
    };
  }).filter(q => q.options.length > 0);

  return (
    <FlashcardTestClient
      passage={{
        id: passage.id,
        title: passage.title,
        content: displayContent,
        originalLevel: passage.originalLevel,
        wordCount: passage.wordCount,
      }}
      questions={questions}
    />
  );
}
