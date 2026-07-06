import "server-only";
import { prisma } from "@/server/lib/db";

// A day counts toward the streak only when total study time that day exceeds this.
export const STREAK_MIN_DAILY_MS = 10 * 60 * 1000;
const STREAK_MIN_DAILY_SECONDS = STREAK_MIN_DAILY_MS / 1000;

export async function getUserProgress(userId: string) {
  const [sessionDays] = await Promise.all([
    // Per-day study time. Open sessions contribute time via lastActivityAt. Raw
    // seconds are returned for every day (ungated); the >threshold gate is applied
    // in JS so today/week totals stay honest while the streak stays gated.
    prisma.$queryRaw<
      Array<{ day: Date | string; secs: number | string | null }>
    >`
      SELECT DATE("startedAt") AS day,
             SUM(GREATEST(EXTRACT(EPOCH FROM (COALESCE("completedAt", "lastActivityAt") - "startedAt")), 0)) AS secs
      FROM "study_sessions"
      WHERE "userId" = ${userId}
      GROUP BY day
      ORDER BY day DESC
      LIMIT 60
    `,
  ]);

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
  const activeDaysThisWeek = weekDayKeys.filter((key) =>
    qualifyingDayKeys.has(key),
  ).length;

  return {
    streakDays,
    timeStudiedTodaySeconds,
    timeStudiedWeekSeconds,
    activeDaysThisWeek,
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
