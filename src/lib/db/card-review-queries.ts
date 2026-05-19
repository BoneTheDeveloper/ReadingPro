import { db } from './client';
import { calculateSM2 } from '../algorithms/sm2';

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
  const result = calculateSM2(
    { easeFactor: previousEaseFactor, intervalDays: previousInterval, repetitions },
    qualityRating
  );
  return {
    easeFactor: result.easeFactor,
    intervalDays: result.intervalDays,
    repetitions: result.repetitions,
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
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [rows, reviewDays] = await Promise.all([
    db.$queryRaw<Array<{
      totalCards: bigint;
      matureCards: bigint;
      dueCards: bigint;
      todayReviews: bigint;
    }>>`
      SELECT
        COUNT(*)::bigint AS "totalCards",
        COUNT(*) FILTER (WHERE "intervalDays" >= 21)::bigint AS "matureCards",
        COUNT(*) FILTER (WHERE "nextReviewDate" <= ${new Date()})::bigint AS "dueCards",
        COUNT(*) FILTER (WHERE "reviewedAt" >= ${startOfToday})::bigint AS "todayReviews"
      FROM "card_reviews"
      WHERE "userId" = ${userId}
    `,
    db.$queryRaw<Array<{ day: Date | string }>>`
      SELECT DISTINCT DATE("reviewedAt") AS day
      FROM "card_reviews"
      WHERE "userId" = ${userId}
      ORDER BY day DESC
      LIMIT 30
    `,
  ]);

  const row = rows[0];
  const reviewDayKeys = new Set(reviewDays.map(({ day }) => toDateKey(day)));
  const streakDays = getCurrentStreakDays(reviewDayKeys);

  return {
    totalCards: Number(row?.totalCards ?? 0),
    matureCards: Number(row?.matureCards ?? 0),
    dueCards: Number(row?.dueCards ?? 0),
    todayReviews: Number(row?.todayReviews ?? 0),
    streakDays,
  };
}

function toDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return date.toISOString().slice(0, 10);
}

function getCurrentStreakDays(reviewDayKeys: Set<string>) {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let streakDays = 0;
  while (reviewDayKeys.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streakDays;
}
