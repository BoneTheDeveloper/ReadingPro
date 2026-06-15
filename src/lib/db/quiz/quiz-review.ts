import { db } from '../client';
import { sm2 } from '../../spaced-repetition/scheduler';

// A day counts toward the streak only when total study time that day exceeds this.
export const STREAK_MIN_DAILY_MS = 10 * 60 * 1000;
const STREAK_MIN_DAILY_SECONDS = STREAK_MIN_DAILY_MS / 1000;

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
  const result = sm2(
    { easeFactor: previousEaseFactor, intervalDays: previousInterval, repetitions },
    qualityRating
  );
  return {
    easeFactor: result.easeFactor,
    intervalDays: result.intervalDays,
    repetitions: result.repetitions,
  };
}

export async function getDueQuestions(userId: string) {
  return db.questionReview.findMany({
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

export async function updateQuestionReview(
  userId: string,
  questionReviewId: string,
  qualityRating: number
) {
  const existing = await db.questionReview.findUniqueOrThrow({
    where: { id: questionReviewId, userId },
  });

  const sm2Result = calculateSM2Interval(
    existing.easeFactor,
    existing.intervalDays,
    existing.repetitions,
    qualityRating
  );

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + sm2Result.intervalDays);

  return db.questionReview.update({
    where: { id: questionReviewId },
    data: {
      qualityRating,
      easeFactor: sm2Result.easeFactor,
      intervalDays: sm2Result.intervalDays,
      repetitions: sm2Result.repetitions,
      nextReviewDate,
      reviewedAt: new Date(),
    },
  });
}

export async function createQuestionReview(
  userId: string,
  questionId: string
) {
  return db.questionReview.create({
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

  const [rows, sessionDays, quizRows] = await Promise.all([
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
      FROM "question_reviews"
      WHERE "userId" = ${userId}
    `,
    // Per-day study time. Open sessions contribute time via lastActivityAt. Raw
    // seconds are returned for every day (ungated); the >threshold gate is applied
    // in JS so today/week totals stay honest while the streak stays gated.
    db.$queryRaw<Array<{ day: Date | string; secs: number | string | null }>>`
      SELECT DATE("startedAt") AS day,
             SUM(GREATEST(EXTRACT(EPOCH FROM (COALESCE("completedAt", "lastActivityAt") - "startedAt")), 0)) AS secs
      FROM "study_sessions"
      WHERE "userId" = ${userId}
      GROUP BY day
      ORDER BY day DESC
      LIMIT 60
    `,
    db.$queryRaw<Array<{
      totalQuizAttempts: bigint;
      avgQuizAccuracy: number | null;
      todayQuizAttempts: bigint;
    }>>`
      SELECT
        COUNT(*) FILTER (WHERE "completedAt" IS NOT NULL)::bigint AS "totalQuizAttempts",
        AVG("accuracyRate") FILTER (WHERE "completedAt" IS NOT NULL AND "accuracyRate" IS NOT NULL) AS "avgQuizAccuracy",
        COUNT(*) FILTER (WHERE "completedAt" >= ${startOfToday})::bigint AS "todayQuizAttempts"
      FROM "quiz_attempts"
      WHERE "userId" = ${userId}
    `,
  ]);

  const row = rows[0];
  const quizRow = quizRows[0];

  const secondsByDay = new Map<string, number>();
  for (const { day, secs } of sessionDays) {
    secondsByDay.set(toDateKey(day), Math.round(Number(secs ?? 0)));
  }

  const qualifyingDayKeys = new Set(
    [...secondsByDay.entries()]
      .filter(([, secs]) => secs > STREAK_MIN_DAILY_SECONDS)
      .map(([day]) => day),
  );
  const streakDays = getCurrentStreakDays(qualifyingDayKeys);

  const weekDayKeys = getRecentDayKeys(7);
  const todayKey = weekDayKeys[0];
  const timeStudiedTodaySeconds = secondsByDay.get(todayKey) ?? 0;
  const timeStudiedWeekSeconds = weekDayKeys.reduce(
    (total, key) => total + (secondsByDay.get(key) ?? 0),
    0,
  );
  const activeDaysThisWeek = weekDayKeys.filter((key) => qualifyingDayKeys.has(key)).length;

  return {
    totalCards: Number(row?.totalCards ?? 0),
    matureCards: Number(row?.matureCards ?? 0),
    dueCards: Number(row?.dueCards ?? 0),
    todayReviews: Number(row?.todayReviews ?? 0),
    streakDays,
    timeStudiedTodaySeconds,
    timeStudiedWeekSeconds,
    activeDaysThisWeek,
    totalQuizAttempts: Number(quizRow?.totalQuizAttempts ?? 0),
    avgQuizAccuracy: quizRow?.avgQuizAccuracy != null ? Math.round(Number(quizRow.avgQuizAccuracy) * 100) / 100 : null,
    todayQuizAttempts: Number(quizRow?.todayQuizAttempts ?? 0),
  };
}

function toDateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  return date.toISOString().slice(0, 10);
}

// Day keys for the last `count` days, ending today (today first). Matches the
// midnight-then-UTC-slice derivation used by getCurrentStreakDays / toDateKey.
function getRecentDayKeys(count: number) {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() - 1);
  }

  return keys;
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
