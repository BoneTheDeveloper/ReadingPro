import { pool, type Queryable } from "@/server/lib/db";
import type { CEFRLevel, SourceType } from "@/shared/enums";
import type { Passage, PassageListItem } from "@/shared/passage/schema";

const PASSAGE_COLUMNS = `"id", "userId", "title", "content", "cefrLevel", "wordCount",
  "sourceType", "filePath", "createdAt", "youtubeUrl", "status"`;

export async function findPassageForUser(
  userId: string,
  id: string,
  db: Queryable = pool,
): Promise<Passage | null> {
  const { rows } = await db.query<Passage>(
    `SELECT ${PASSAGE_COLUMNS} FROM "Passage" WHERE "id" = $1 AND "userId" = $2`,
    [id, userId],
  );
  return rows[0] ?? null;
}

export async function listPassagesForUser(
  userId: string,
  db: Queryable = pool,
): Promise<PassageListItem[]> {
  const { rows } = await db.query<PassageListItem>(
    `SELECT "id", "title", "cefrLevel", "wordCount", "sourceType", "status", "createdAt"
     FROM "Passage" WHERE "userId" = $1
     ORDER BY "createdAt" DESC`,
    [userId],
  );
  return rows;
}

/** False when the user owns no passage with this id. */
export async function deletePassageForUser(
  userId: string,
  id: string,
  db: Queryable = pool,
): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM "Passage" WHERE "id" = $1 AND "userId" = $2`,
    [id, userId],
  );
  return rowCount === 1;
}

export async function createPassageForUser(
  args: { userId: string; sourceType: SourceType; youtubeUrl?: string | null },
  db: Queryable = pool,
): Promise<Passage> {
  const youtubeUrl = args.sourceType === "YOUTUBE" ? (args.youtubeUrl ?? null) : null;
  const { rows } = await db.query<Passage>(
    `INSERT INTO "Passage" ("userId", "sourceType", "filePath", "youtubeUrl", "status")
     VALUES ($1, $2, NULL, $3, 'PENDING')
     RETURNING ${PASSAGE_COLUMNS}`,
    [args.userId, args.sourceType, youtubeUrl],
  );
  return rows[0];
}

/** Null when the passage no longer exists, for example deleted during processing. */
export async function completePassageProcessing(
  args: {
    userId: string;
    passageId: string;
    content: string;
    title: string;
    cefrLevel: CEFRLevel | null;
  },
  db: Queryable = pool,
): Promise<Passage | null> {
  const wordCount = args.content.split(/\s+/).filter(Boolean).length;

  const { rows } = await db.query<Passage>(
    `UPDATE "Passage"
     SET "title" = $3, "content" = $4, "cefrLevel" = $5, "wordCount" = $6, "status" = 'COMPLETED'
     WHERE "id" = $1 AND "userId" = $2
     RETURNING ${PASSAGE_COLUMNS}`,
    [args.passageId, args.userId, args.title, args.content, args.cefrLevel, wordCount],
  );
  return rows[0] ?? null;
}

/**
 * Terminal failure state for background processing. Keeps the row — and the
 * user's uploaded content — so the failure is visible and deletable, instead
 * of vanishing silently. Null when the passage no longer exists.
 */
export async function failPassageProcessing(
  args: { userId: string; passageId: string },
  db: Queryable = pool,
): Promise<Passage | null> {
  const { rows } = await db.query<Passage>(
    `UPDATE "Passage" SET "status" = 'FAILED'
     WHERE "id" = $1 AND "userId" = $2
     RETURNING ${PASSAGE_COLUMNS}`,
    [args.passageId, args.userId],
  );
  return rows[0] ?? null;
}
