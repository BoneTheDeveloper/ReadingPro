'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { createModuleLogger } from '@/lib/core/logger';
import { generateQuestionsForPassage, PassageStudyServiceError } from '@/lib/study/passage/passage-study.service';
import { getAuthenticatedUser } from './study-shared';

const log = createModuleLogger('actions:study-generate-questions');

import type { QuestionData } from '@/features/study/model/types';

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

    try {
      const questions = await generateQuestionsForPassage(user.id, passageId);
      log.info({ passageId, questionCount: questions.length, totalMs: Date.now() - start }, 'Generate questions action complete');
      return { questions };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (error instanceof PassageStudyServiceError) {
        return { error: error.message };
      }
      log.warn(
        { err, context: { passageId, totalMs: Date.now() - start } },
        'Question generation failed',
      );
      return { error: 'Question generation failed — try again' };
    }
  });
}
