import { pool, type Queryable } from "@/server/lib/db";
import type { ReviewRating, VocabularyStatus } from "@/shared/enums";
import type { ReviewSession } from "@/shared/vocabulary/review-schema";
import type { ScheduleState } from "../fsrs-scheduler";
import { itemColumns, type VocabularyItemRow } from "../items/vocabulary-item-repository";

/** A word with the passage it was saved from, as review shows it. */
export type CardRow = VocabularyItemRow & { passage: { id: string; title: string } | null };

const CARD_SELECT = `SELECT ${itemColumns("i")},
    CASE WHEN p."id" IS NULL THEN NULL
         ELSE json_build_object('id', p."id", 'title', p."title") END AS "passage"
  FROM "VocabularyItem" i
  LEFT JOIN "Passage" p ON p."id" = i."passageId"`;

const SESSION_COLUMNS = `"id", "vocabularySetId", "startedAt", "endedAt", "cardsReviewed"`;

export async function findCardForUser(
  userId: string,
  id: string,
  db: Queryable = pool,
): Promise<CardRow | null> {
  const { rows } = await db.query<CardRow>(
    `${CARD_SELECT} WHERE i."id" = $1 AND i."userId" = $2`,
    [id, userId],
  );
  return rows[0] ?? null;
}

/**
 * Reads the card and locks its row until `tx` ends, so two ratings of one card
 * cannot both read the same state. Null when the user owns no such word.
 */
export async function lockCardForUser(
  userId: string,
  id: string,
  tx: Queryable,
): Promise<VocabularyItemRow | null> {
  const { rows } = await tx.query<VocabularyItemRow>(
    `SELECT ${itemColumns()} FROM "VocabularyItem" WHERE "id" = $1 AND "userId" = $2 FOR UPDATE`,
    [id, userId],
  );
  return rows[0] ?? null;
}

/** Studied cards due at `now`, oldest due first; all sets when `setId` is null. */
export async function listDueCards(
  userId: string,
  now: Date,
  setId: string | null,
  db: Queryable = pool,
): Promise<CardRow[]> {
  const { rows } = await db.query<CardRow>(
    `${CARD_SELECT}
     WHERE i."userId" = $1 AND i."status" <> 'NEW' AND i."dueAt" <= $2
       AND ($3::uuid IS NULL OR i."vocabularySetId" = $3)
     ORDER BY i."dueAt" ASC`,
    [userId, now, setId],
  );
  return rows;
}

/**
 * First ratings since `since`, counted by the set each word is in now; all
 * sets when `setId` is null.
 */
export async function countNewCardsIntroducedSince(
  userId: string,
  since: Date,
  setId: string | null,
  db: Queryable = pool,
): Promise<{ vocabularySetId: string; count: number }[]> {
  const { rows } = await db.query<{ vocabularySetId: string; count: number }>(
    `SELECT i."vocabularySetId", COUNT(*)::int AS "count"
     FROM "ReviewLog" l
     JOIN "VocabularyItem" i ON i."id" = l."vocabularyItemId"
     WHERE l."userId" = $1 AND l."status" = 'NEW' AND l."reviewedAt" >= $2
       AND ($3::uuid IS NULL OR i."vocabularySetId" = $3)
     GROUP BY i."vocabularySetId"`,
    [userId, since, setId],
  );
  return rows;
}

/** Never-studied cards of a set, oldest saved first. */
export async function listNewCardsInSet(
  userId: string,
  setId: string,
  limit: number,
  db: Queryable = pool,
): Promise<CardRow[]> {
  const { rows } = await db.query<CardRow>(
    `${CARD_SELECT}
     WHERE i."userId" = $1 AND i."status" = 'NEW' AND i."vocabularySetId" = $2
     ORDER BY i."createdAt" ASC
     LIMIT $3`,
    [userId, setId, limit],
  );
  return rows;
}

export async function createSession(
  userId: string,
  setId: string | null,
  db: Queryable = pool,
): Promise<ReviewSession> {
  const { rows } = await db.query<ReviewSession>(
    `INSERT INTO "ReviewSession" ("userId", "vocabularySetId") VALUES ($1, $2)
     RETURNING ${SESSION_COLUMNS}`,
    [userId, setId],
  );
  return rows[0];
}

export async function findSessionForUser(
  userId: string,
  id: string,
  db: Queryable = pool,
): Promise<ReviewSession | null> {
  const { rows } = await db.query<ReviewSession>(
    `SELECT ${SESSION_COLUMNS} FROM "ReviewSession" WHERE "id" = $1 AND "userId" = $2`,
    [id, userId],
  );
  return rows[0] ?? null;
}

/** Sets `endedAt` unless the session already ended, so the first end time stays. */
export async function endSession(
  userId: string,
  id: string,
  endedAt: Date,
  db: Queryable = pool,
): Promise<ReviewSession | null> {
  const { rows } = await db.query<ReviewSession>(
    `UPDATE "ReviewSession" SET "endedAt" = COALESCE("endedAt", $3)
     WHERE "id" = $1 AND "userId" = $2
     RETURNING ${SESSION_COLUMNS}`,
    [id, userId, endedAt],
  );
  return rows[0] ?? null;
}

export async function incrementCardsReviewed(id: string, db: Queryable = pool): Promise<void> {
  await db.query(
    `UPDATE "ReviewSession" SET "cardsReviewed" = "cardsReviewed" + 1 WHERE "id" = $1`,
    [id],
  );
}

export async function findLogByClientReviewId(
  clientReviewId: string,
  db: Queryable = pool,
): Promise<{ userId: string; vocabularyItemId: string } | null> {
  const { rows } = await db.query<{ userId: string; vocabularyItemId: string }>(
    `SELECT "userId", "vocabularyItemId" FROM "ReviewLog" WHERE "clientReviewId" = $1`,
    [clientReviewId],
  );
  return rows[0] ?? null;
}

/** Throws a unique violation when `clientReviewId` was already logged. */
export async function insertReviewLog(
  log: {
    userId: string;
    vocabularyItemId: string;
    sessionId: string;
    clientReviewId: string;
    rating: ReviewRating;
    status: VocabularyStatus;
    dueAt: Date;
    stability: number;
    difficulty: number;
    learningSteps: number;
    elapsedDays: number;
    scheduledDays: number;
    durationMs: number | null;
    reviewedAt: Date;
  },
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `INSERT INTO "ReviewLog" ("userId", "vocabularyItemId", "sessionId", "clientReviewId",
       "rating", "status", "dueAt", "stability", "difficulty", "learningSteps", "elapsedDays",
       "scheduledDays", "durationMs", "reviewedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      log.userId,
      log.vocabularyItemId,
      log.sessionId,
      log.clientReviewId,
      log.rating,
      log.status,
      log.dueAt,
      log.stability,
      log.difficulty,
      log.learningSteps,
      log.elapsedDays,
      log.scheduledDays,
      log.durationMs,
      log.reviewedAt,
    ],
  );
}

/** Writes the scheduler's new state for the card. */
export async function updateCardSchedule(
  id: string,
  next: ScheduleState,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE "VocabularyItem"
     SET "status" = $2, "dueAt" = $3, "stability" = $4, "difficulty" = $5, "scheduledDays" = $6,
         "learningSteps" = $7, "reps" = $8, "lapses" = $9, "lastReviewAt" = $10, "updatedAt" = now()
     WHERE "id" = $1`,
    [
      id,
      next.status,
      next.dueAt,
      next.stability,
      next.difficulty,
      next.scheduledDays,
      next.learningSteps,
      next.reps,
      next.lapses,
      next.lastReviewAt,
    ],
  );
}
