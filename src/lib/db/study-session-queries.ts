import { z } from 'zod';
import { db } from './client';

const passageIdSchema = z.string().uuid().optional();

export const createStudySessionSchema = z.object({
  userId: z.string().min(1, 'userId is required'),
  passageId: passageIdSchema,
});

export const updateStudySessionSchema = z
  .object({
    completedAt: z.date().optional(),
    cardsReviewed: z.number().int().nonnegative().optional(),
    newCards: z.number().int().nonnegative().optional(),
    correctCount: z.number().int().nonnegative().optional(),
    incorrectCount: z.number().int().nonnegative().optional(),
    accuracyRate: z.number().min(0).max(100).optional(),
  })
  .refine(
    (data) => {
      const hasCounts = data.correctCount !== undefined || data.incorrectCount !== undefined;
      const hasAccuracy = data.accuracyRate !== undefined;
      if (hasCounts && hasAccuracy) {
        return false;
      }
      return true;
    },
    {
      message: 'Cannot provide both count-based accuracy and explicit accuracyRate',
    }
  );

export async function computeSessionAccuracy(
  sessionId: string,
  userId: string
): Promise<number | null> {
  const session = await db.studySession.findUnique({
    where: { id: sessionId, userId },
  });
  if (!session || !session.startedAt) return null;

  const completedReviews = await db.cardReview.count({
    where: {
      userId,
      reviewedAt: { gte: session.startedAt },
    },
  });
  if (completedReviews === 0) return null;

  const correctReviews = await db.cardReview.count({
    where: {
      userId,
      reviewedAt: { gte: session.startedAt },
      qualityRating: { gte: 3 },
    },
  });

  return Math.round((correctReviews / completedReviews) * 100 * 100) / 100;
}

export async function createStudySession(userId: string, passageId?: string) {
  const validated = createStudySessionSchema.parse({ userId, passageId });

  if (validated.passageId) {
    const passage = await db.passage.findUnique({
      where: { id: validated.passageId, userId: validated.userId },
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

  return db.studySession.create({
    data: {
      userId: validated.userId,
      passageId: validated.passageId,
      startedAt: new Date(),
    },
  });
}

export async function updateStudySession(
  userId: string,
  sessionId: string,
  data: {
    completedAt?: Date;
    cardsReviewed?: number;
    newCards?: number;
    correctCount?: number;
    incorrectCount?: number;
    accuracyRate?: number;
  }
) {
  const validated = updateStudySessionSchema.parse(data);

  const session = await db.studySession.findUnique({
    where: { id: sessionId, userId },
  });
  if (!session) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'Session not found or not owned by user',
        path: ['sessionId'],
      },
    ]);
  }

  if (!session.startedAt) {
    throw new z.ZodError([
      {
        code: 'custom',
        message: 'Session has not started',
        path: ['sessionId'],
      },
    ]);
  }

  let accuracyRate: number | undefined;
  if (validated.completedAt) {
    const computed = await computeSessionAccuracy(sessionId, userId);
    accuracyRate = computed ?? undefined;
  }

  return db.studySession.update({
    where: { id: sessionId },
    data: {
      completedAt: validated.completedAt,
      cardsReviewed: validated.cardsReviewed,
      newCards: validated.newCards,
      correctCount: validated.correctCount,
      incorrectCount: validated.incorrectCount,
      accuracyRate,
    },
  });
}