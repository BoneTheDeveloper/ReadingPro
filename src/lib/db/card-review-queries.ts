import { db } from './client';
export { getCEFRColor, getCEFRLabel } from '../shared/cefr-utils';

export function calculateSM2Interval(
  previousEaseFactor: number,
  previousInterval: number,
  repetitions: number,
  qualityRating: number
): {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
} {
  let newEaseFactor = previousEaseFactor;
  let newRepetitions = repetitions;
  let newInterval = previousInterval;

  if (qualityRating < 3) {
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions += 1;

    newEaseFactor = Math.max(
      1.3,
      previousEaseFactor + (0.1 - (5 - qualityRating) * (0.08 + (5 - qualityRating) * 0.02))
    );

    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(previousInterval * newEaseFactor);
    }
  }

  return {
    easeFactor: Number(newEaseFactor.toFixed(2)),
    intervalDays: newInterval,
    repetitions: newRepetitions,
  };
}

export async function getDueCards(userId: string) {
  return db.cardReview.findMany({
    where: {
      userId,
      nextReviewDate: { lte: new Date() },
    },
    include: {
      question: { include: { passage: true } },
    },
    orderBy: { nextReviewDate: 'asc' },
    take: 20,
  });
}

export async function updateCardReview(
  userId: string,
  cardReviewId: string,
  qualityRating: number
) {
  const existing = await db.cardReview.findUniqueOrThrow({
    where: { id: cardReviewId, userId },
  });

  const sm2 = calculateSM2Interval(
    existing.easeFactor,
    existing.intervalDays,
    existing.repetitions,
    qualityRating
  );

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + sm2.intervalDays);

  return db.cardReview.update({
    where: { id: cardReviewId },
    data: {
      qualityRating,
      easeFactor: sm2.easeFactor,
      intervalDays: sm2.intervalDays,
      repetitions: sm2.repetitions,
      nextReviewDate,
      reviewedAt: new Date(),
    },
  });
}

export async function createCardReview(
  userId: string,
  questionId: string
) {
  return db.cardReview.create({
    data: {
      userId,
      questionId,
      qualityRating: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
    },
  });
}

export async function getUserProgress(userId: string) {
  const [totalCards, matureCards, dueCards, todayReviews] = await Promise.all([
    db.cardReview.count({ where: { userId } }),
    db.cardReview.count({ where: { userId, intervalDays: { gte: 21 } } }),
    db.cardReview.count({ where: { userId, nextReviewDate: { lte: new Date() } } }),
    db.cardReview.count({
      where: {
        userId,
        reviewedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  return { totalCards, matureCards, dueCards, todayReviews };
}
