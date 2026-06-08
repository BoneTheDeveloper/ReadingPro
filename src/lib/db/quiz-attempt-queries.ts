import { z } from 'zod';
import { db } from './client';

export async function createQuizAttempt(
  studySessionId: string,
  userId: string,
  passageId?: string,
) {
  const session = await db.studySession.findUnique({
    where: { id: studySessionId, userId },
  });
  if (!session) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'Study session not found or not owned by user',
        path: ['studySessionId'],
      },
    ]);
  }

  if (passageId) {
    const passage = await db.passage.findUnique({
      where: { id: passageId, userId, deletedAt: null },
    });
    if (!passage) {
      throw new z.ZodError([
        {
          code: 'custom',
          message: 'Passage not found or not owned by user',
          path: ['passageId'],
        },
      ]);
    }
  }

  return db.quizAttempt.create({
    data: {
      studySessionId,
      userId,
      passageId: passageId ?? null,
      startedAt: new Date(),
    },
  });
}

export async function completeQuizAttempt(
  attemptId: string,
  userId: string,
  data: { correctCount: number; incorrectCount: number; totalQuestions: number },
) {
  const attempt = await db.quizAttempt.findUnique({
    where: { id: attemptId, userId },
  });
  if (!attempt) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'Quiz attempt not found or not owned by user',
        path: ['attemptId'],
      },
    ]);
  }

  if (attempt.completedAt) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'Quiz attempt already completed',
        path: ['attemptId'],
      },
    ]);
  }

  const accuracyRate =
    data.totalQuestions > 0
      ? Math.round((data.correctCount / data.totalQuestions) * 100 * 100) / 100
      : 0;

  return db.quizAttempt.update({
    where: { id: attemptId },
    data: {
      correctCount: data.correctCount,
      incorrectCount: data.incorrectCount,
      totalQuestions: data.totalQuestions,
      accuracyRate,
      completedAt: new Date(),
    },
  });
}
