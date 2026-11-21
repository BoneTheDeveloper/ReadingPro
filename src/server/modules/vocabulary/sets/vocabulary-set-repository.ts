import { pool, type Queryable } from "@/server/lib/db";
import { itemColumns, type VocabularyItemRow } from "../items/vocabulary-item-repository";

export type SetRow = {
  id: string;
  name: string;
  isDefault: boolean;
  dailyNewLimit: number;
  createdAt: Date;
};

const SET_COLUMNS = `"id", "name", "isDefault", "dailyNewLimit", "createdAt"`;

export async function findDefaultSetId(userId: string, db: Queryable = pool): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT "id" FROM "VocabularySet" WHERE "userId" = $1 AND "isDefault" LIMIT 1`,
    [userId],
  );
  return rows[0]?.id ?? null;
}

/** Creates the default set, or makes the user's set of that name the default one. */
export async function upsertDefaultSet(
  userId: string,
  name: string,
  db: Queryable = pool,
): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO "VocabularySet" ("userId", "name", "isDefault") VALUES ($1, $2, true)
     ON CONFLICT ("userId", "name") DO UPDATE SET "isDefault" = true
     RETURNING "id"`,
    [userId, name],
  );
  return rows[0].id;
}

export async function findSetForUser(
  userId: string,
  id: string,
  db: Queryable = pool,
): Promise<SetRow | null> {
  const { rows } = await db.query<SetRow>(
    `SELECT ${SET_COLUMNS} FROM "VocabularySet" WHERE "id" = $1 AND "userId" = $2`,
    [id, userId],
  );
  return rows[0] ?? null;
}

/** The default set first, then the newest. */
export async function listSetsForUser(userId: string, db: Queryable = pool): Promise<SetRow[]> {
  const { rows } = await db.query<SetRow>(
    `SELECT ${SET_COLUMNS} FROM "VocabularySet" WHERE "userId" = $1
     ORDER BY "isDefault" DESC, "createdAt" DESC`,
    [userId],
  );
  return rows;
}

/** Throws a unique violation when the user already has a set with this name. */
export async function createSet(userId: string, name: string, db: Queryable = pool): Promise<SetRow> {
  const { rows } = await db.query<SetRow>(
    `INSERT INTO "VocabularySet" ("userId", "name") VALUES ($1, $2) RETURNING ${SET_COLUMNS}`,
    [userId, name],
  );
  return rows[0];
}

/**
 * `undefined` leaves a field unchanged. Null when the user owns no set with
 * this id. Throws a unique violation when the new name is taken.
 */
export async function updateSet(
  userId: string,
  id: string,
  fields: { name?: string; dailyNewLimit?: number },
  db: Queryable = pool,
): Promise<SetRow | null> {
  const { rows } = await db.query<SetRow>(
    `UPDATE "VocabularySet"
     SET "name" = COALESCE($3, "name"), "dailyNewLimit" = COALESCE($4::int, "dailyNewLimit")
     WHERE "id" = $1 AND "userId" = $2
     RETURNING ${SET_COLUMNS}`,
    [id, userId, fields.name ?? null, fields.dailyNewLimit ?? null],
  );
  return rows[0] ?? null;
}

/** False when the user owns no set with this id. The set must be empty first. */
export async function deleteSet(userId: string, id: string, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM "VocabularySet" WHERE "id" = $1 AND "userId" = $2`,
    [id, userId],
  );
  return rowCount === 1;
}

/** Files the user's words with these ids into `setId`. */
export async function moveItemsToSet(
  userId: string,
  itemIds: string[],
  setId: string,
  db: Queryable = pool,
): Promise<void> {
  if (itemIds.length === 0) return;
  await db.query(
    `UPDATE "VocabularyItem" SET "vocabularySetId" = $3, "updatedAt" = now()
     WHERE "userId" = $1 AND "id" = ANY($2::uuid[])`,
    [userId, itemIds, setId],
  );
}

/** Moves the user's words in `fromSetId` (only `itemId` when given) into `toSetId`. */
export async function moveItemsBetweenSets(
  userId: string,
  fromSetId: string,
  toSetId: string,
  itemId?: string,
  db: Queryable = pool,
): Promise<void> {
  await db.query(
    `UPDATE "VocabularyItem" SET "vocabularySetId" = $3, "updatedAt" = now()
     WHERE "userId" = $1 AND "vocabularySetId" = $2 AND ($4::uuid IS NULL OR "id" = $4)`,
    [userId, fromSetId, toSetId, itemId ?? null],
  );
}

/** How many of these ids are the user's words. */
export async function countOwnedItems(
  userId: string,
  itemIds: string[],
  db: Queryable = pool,
): Promise<number> {
  if (itemIds.length === 0) return 0;
  const { rows } = await db.query<{ count: number }>(
    `SELECT COUNT(*)::int AS "count" FROM "VocabularyItem"
     WHERE "userId" = $1 AND "id" = ANY($2::uuid[])`,
    [userId, itemIds],
  );
  return rows[0].count;
}

/** The words of these sets, newest first. */
export async function listItemsInSets(
  userId: string,
  setIds: string[],
  db: Queryable = pool,
): Promise<VocabularyItemRow[]> {
  if (setIds.length === 0) return [];
  const { rows } = await db.query<VocabularyItemRow>(
    `SELECT ${itemColumns()} FROM "VocabularyItem"
     WHERE "userId" = $1 AND "vocabularySetId" = ANY($2::uuid[])
     ORDER BY "createdAt" DESC`,
    [userId, setIds],
  );
  return rows;
}

/** Studied words of the set that are due at `now`, oldest due first. */
export async function listDueItemIdsInSet(
  userId: string,
  setId: string,
  now: Date,
  limit: number,
  db: Queryable = pool,
): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT "id" FROM "VocabularyItem"
     WHERE "userId" = $1 AND "vocabularySetId" = $2 AND "status" <> 'NEW' AND "dueAt" <= $3
     ORDER BY "dueAt" ASC
     LIMIT $4`,
    [userId, setId, now, limit],
  );
  return rows.map((row) => row.id);
}

/** Never-studied words of the set, oldest saved first. */
export async function listNewItemIdsInSet(
  userId: string,
  setId: string,
  limit: number,
  db: Queryable = pool,
): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT "id" FROM "VocabularyItem"
     WHERE "userId" = $1 AND "vocabularySetId" = $2 AND "status" = 'NEW'
     ORDER BY "createdAt" ASC
     LIMIT $3`,
    [userId, setId, limit],
  );
  return rows.map((row) => row.id);
}
