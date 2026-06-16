'use server';

import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
import { createModuleLogger } from '@/lib/core/logger';
import {
  recordQuizResult,
  resetQuizResult,
} from '@/lib/study/passage/studio-artifacts-service';
import type { StudioArtifactType } from '@/lib/study/shared/studio-artifact-types';
import type { QuestionData } from '@/features/study/model/types';
import { db } from '@/lib/db/client';
import { getAuthenticatedUser } from './study-shared';

const log = createModuleLogger('actions:studio-artifact');

type ActionResult<T> = T | { error: string };

// `options` is a Json column. New rows store the array natively, but rows written
// before that fix hold a JSON-encoded string — parse those so the UI always gets
// an array and never calls `.map` on a string.
function parseQuestionOptions(value: unknown): QuestionData['options'] {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as QuestionData['options'];
    } catch {
      return [];
    }
  }
  return (value ?? []) as QuestionData['options'];
}

// Loads artifact detail for lazy viewing. Returns content shaped for ArtifactDetailCacheEntry.
export async function studioLoadArtifactDetailAction(input: {
  artifactId: string;
  type: StudioArtifactType;
  passageId: string;
}): Promise<ActionResult<{ questions?: QuestionData[]; simplifiedContent?: string | null; simplifiedLevel?: string | null }>> {
  return Sentry.withServerActionInstrumentation('studioLoadArtifactDetail', { headers: await headers() }, async () => {
    const user = await getAuthenticatedUser();
    try {
      if (input.type === 'quiz') {
        // Scope through the parent artifact's owner so a user can only read
        // questions for artifacts they own (prevents cross-user id probing).
        const questions = await db.question.findMany({
          where: { artifactId: input.artifactId, artifact: { userId: user.id } },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            questionText: true,
            options: true,
            correctOption: true,
            sourceText: true,
            sourceLine: true,
            explanation: true,
            questionType: true,
            difficulty: true,
          },
        });
        const mapped: QuestionData[] = questions.map((q, i) => ({
          id: q.id,
          number: i + 1,
          questionText: q.questionText,
          options: parseQuestionOptions(q.options),
          correctAnswer: q.correctOption,
          sourceText: q.sourceText,
          sourceLine: q.sourceLine,
          explanation: q.explanation,
          questionType: q.questionType,
          difficulty: q.difficulty,
        }));
        return { questions: mapped };
      }

      return { error: `Detail loading not supported for type: ${input.type}` };
    } catch (err) {
      log.error({ err, input }, 'Failed to load artifact detail');
      return { error: 'Failed to load artifact detail' };
    }
  });
}

export async function studioRecordQuizResultAction(input: {
  artifactId: string;
  correctCount: number;
  totalQuestions: number;
}): Promise<ActionResult<{ ok: true }>> {
  return Sentry.withServerActionInstrumentation('studioRecordQuizResult', { headers: await headers() }, async () => {
    const user = await getAuthenticatedUser();
    try {
      if (input.correctCount < 0 || input.totalQuestions <= 0 || input.correctCount > input.totalQuestions) {
        return { error: 'Invalid quiz result data' };
      }

      await recordQuizResult(input.artifactId, user.id, {
        correctCount: input.correctCount,
        totalQuestions: input.totalQuestions,
      });
      return { ok: true as const };
    } catch (err) {
      log.error({ err, artifactId: input.artifactId }, 'Failed to record quiz result');
      return { error: 'Failed to record quiz result' };
    }
  });
}

export async function studioResetQuizResultAction(input: {
  artifactId: string;
}): Promise<ActionResult<{ ok: true }>> {
  return Sentry.withServerActionInstrumentation('studioResetQuizResult', { headers: await headers() }, async () => {
    const user = await getAuthenticatedUser();
    try {
      await resetQuizResult(input.artifactId, user.id);
      return { ok: true as const };
    } catch (err) {
      log.error({ err, artifactId: input.artifactId }, 'Failed to reset quiz result');
      return { error: 'Failed to reset quiz result' };
    }
  });
}
