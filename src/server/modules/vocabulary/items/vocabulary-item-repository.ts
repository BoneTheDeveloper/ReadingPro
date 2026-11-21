import { pool, type Queryable } from "@/server/lib/db";
import type { PartOfSpeech, VocabularyStatus } from "@/shared/enums";
import type { ScheduleState } from "../fsrs-scheduler";

/** A full "VocabularyItem" row. */
export type VocabularyItemRow = ScheduleState & {
  id: string;
  userId: string;
  term: string;
  targetLanguage: string;
  translation: string;
  sourceLanguage: string;
  partofSpeech: PartOfSpeech;
  savedCount: number;
  createdAt: Date;
  updatedAt: Date;
  contextSentence: string | null;
  passageId: string | null;
  vocabularySetId: string;
};

const ITEM_COLUMN_NAMES = [
  "id", "userId", "term", "targetLanguage", "translation", "sourceLanguage", "partofSpeech",
  "savedCount", "createdAt", "updatedAt", "contextSentence", "difficulty", "dueAt", "lapses",
  "lastReviewAt", "learningSteps", "passageId", "reps", "scheduledDays", "stability", "status",
  "vocabularySetId",
] as const satisfies readonly (keyof VocabularyItemRow)[];

/** Every item column, optionally qualified with a table alias for joins. */
export function itemColumns(alias?: string): string {
  const prefix = alias ? `${alias}.` : "";
  return ITEM_COLUMN_NAMES.map((name) => `${prefix}"${name}"`).join(", ");
}

/**
 * Saves a word, or counts a repeat save of the same term and translation. A
 * repeat save updates the part of speech only: it keeps the first context and
 * the set the user filed the word in.
 */
export async function upsertVocabularyItem(
  item: {
    userId: string;
    term: string;
    translation: string;
    sourceLanguage: string;
    targetLanguage: string;
    partofSpeech: PartOfSpeech;
    contextSentence: string | null;
    passageId: string | null;
    vocabularySetId: string;
  },
  db: Queryable = pool,
): Promise<VocabularyItemRow> {
  const { rows } = await db.query<VocabularyItemRow>(
    `INSERT INTO "VocabularyItem" ("userId", "term", "translation", "sourceLanguage",
       "targetLanguage", "partofSpeech", "contextSentence", "passageId", "vocabularySetId")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT ("userId", "term", "translation") DO UPDATE
     SET "partofSpeech" = EXCLUDED."partofSpeech",
         "savedCount" = "VocabularyItem"."savedCount" + 1,
         "updatedAt" = now()
     RETURNING ${itemColumns()}`,
    [
      item.userId,
      item.term,
      item.translation,
      item.sourceLanguage,
      item.targetLanguage,
      item.partofSpeech,
      item.contextSentence,
      item.passageId,
      item.vocabularySetId,
    ],
  );
  return rows[0];
}

export async function listVocabularyItemsForUser(
  userId: string,
  db: Queryable = pool,
): Promise<VocabularyItemRow[]> {
  const { rows } = await db.query<VocabularyItemRow>(
    `SELECT ${itemColumns()} FROM "VocabularyItem" WHERE "userId" = $1 ORDER BY "createdAt" DESC`,
    [userId],
  );
  return rows;
}

/** False when the user owns no word with this id. */
export async function deleteVocabularyItem(
  userId: string,
  id: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM "VocabularyItem" WHERE "id" = $1 AND "userId" = $2`,
    [id, userId],
  );
  return rowCount === 1;
}

/**
 * Edits the user-owned fields; `undefined` leaves a field unchanged. Null when
 * the user owns no word with this id. Throws a unique violation when the new
 * term and translation are already saved.
 */
export async function updateVocabularyItem(
  userId: string,
  id: string,
  fields: { term?: string; translation?: string; partofSpeech?: PartOfSpeech },
  db: Queryable = pool,
): Promise<VocabularyItemRow | null> {
  const { rows } = await db.query<VocabularyItemRow>(
    `UPDATE "VocabularyItem"
     SET "term" = COALESCE($3, "term"),
         "translation" = COALESCE($4, "translation"),
         "partofSpeech" = COALESCE($5::"PartOfSpeech", "partofSpeech"),
         "updatedAt" = now()
     WHERE "id" = $1 AND "userId" = $2
     RETURNING ${itemColumns()}`,
    [id, userId, fields.term ?? null, fields.translation ?? null, fields.partofSpeech ?? null],
  );
  return rows[0] ?? null;
}

export async function countVocabularyItemsByStatus(
  userId: string,
  db: Queryable = pool,
): Promise<{ status: VocabularyStatus; count: number }[]> {
  const { rows } = await db.query<{ status: VocabularyStatus; count: number }>(
    `SELECT "status", COUNT(*)::int AS "count"
     FROM "VocabularyItem" WHERE "userId" = $1
     GROUP BY "status"`,
    [userId],
  );
  return rows;
}
