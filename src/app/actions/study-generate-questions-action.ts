'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { db } from '@/lib/db/client';
import { createModuleLogger } from '@/lib/core/logger';
import { generateComprehensionQuestions, type GeneratedQuestion } from '@/lib/ai/question-generator';
import { questionDataSchema } from '@/lib/db/passage-queries';
import { getAuthenticatedUser } from './study-shared';

const log = createModuleLogger('actions:study-generate-questions');

import type { QuestionData } from '@/app/(dashboard)/study/study-types';

export type GenerateQuestionsResult =
  | { questions: QuestionData[] }
  | { error: string };

export async function studyGenerateQuestionsAction({ passageId }: { passageId: string }): Promise<GenerateQuestionsResult> {
  const start = Date.now();
  log.info({ passageId }, 'Generate questions action started');

  return Sentry.withServerActionInstrumentation('studyGenerateQuestions', {
    headers: await headers(),
  }, async () => {
    const user = await getAuthenticatedUser();

    const passage = await Sentry.startSpan({ name: 'db:passage-fetch', op: 'db' }, async () => {
      return db.passage.findUnique({ where: { id: passageId, userId: user.id } });
    });

    if (!passage) {
      return { error: 'Passage not found' };
    }

    const contentToAnalyze = passage.simplifiedContent || passage.content;

    let questions: GeneratedQuestion[] = [];
    try {
      Sentry.addBreadcrumb({ category: 'ai', message: 'Generating comprehension questions', level: 'info' });
      const questionResult = await Sentry.startSpan({ name: 'ai:question-gen', op: 'ai' }, async () => {
        return generateComprehensionQuestions(contentToAnalyze.slice(0, 10000), 5);
      });

      if (!questionResult) {
        return { error: 'Question generation failed — try again' };
      }
      questions = questionResult.questions;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      log.warn({ err, passageId, totalMs: Date.now() - start }, 'Question generation failed');
      return { error: 'Question generation failed — try again' };
    }

    if (questions.length === 0) {
      return { error: 'No questions generated — try again' };
    }

    const validQuestions = questions.filter(q => {
      const result = questionDataSchema.safeParse({
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctAnswer,
        sourceText: q.sourceText,
        sourceLine: q.sourceLine,
        explanation: q.explanation,
      });
      return result.success;
    });

    if (validQuestions.length === 0) {
      return { error: 'All generated questions failed validation — try again' };
    }

    // Replace existing questions (atomic — passage ownership already verified)
    await Sentry.startSpan({ name: 'db:questions-replace', op: 'db' }, async () => {
      await db.$transaction([
        db.question.deleteMany({ where: { passageId } }),
        db.question.createMany({
          data: validQuestions.map(q => ({
            passageId,
            questionText: q.questionText,
            options: JSON.stringify(q.options),
            correctOption: q.correctAnswer,
            sourceText: q.sourceText,
            sourceLine: q.sourceLine,
            explanation: q.explanation,
            questionType: q.questionType,
            difficulty: q.difficulty,
          })),
        }),
      ]);
    });

    const questionsData = questions.map((q, i) => ({
      id: `pending-${i}`,
      number: i + 1,
      questionText: q.questionText,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      sourceText: q.sourceText,
      sourceLine: q.sourceLine,
      questionType: q.questionType,
      difficulty: q.difficulty,
    }));

    log.info({ passageId, questionCount: questions.length, totalMs: Date.now() - start }, 'Generate questions action complete');

    return { questions: questionsData };
  });
}
