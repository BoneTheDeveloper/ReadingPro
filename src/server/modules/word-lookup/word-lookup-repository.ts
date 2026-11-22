import { pool, type Queryable } from "@/server/lib/db";
import type { WordLookup } from "@/shared/dictionary/schema";

// The row subtitle: the first meaning of the entry, if the word is still in the dictionary.
const COLUMNS = `l."id", l."passageId", l."headword", l."selectedText", l."contextSentence", l."lookedUpAt",
  d."senses" -> 0 -> 'meanings' -> 0 ->> 'text' AS "summary"`;

type UpsertLookup = {
  userId: string;
  passageId: string;
  headword: string;
  selectedText: string;
  contextSentence: string | null;
};

/** Records a lookup; looking the same headword up again in the passage moves its row to the top. */
export async function upsertLookup(input: UpsertLookup, db: Queryable = pool): Promise<WordLookup> {
  const { rows } = await db.query<WordLookup>(
    `WITH l AS (
       INSERT INTO "WordLookup" ("userId", "passageId", "headword", "selectedText", "contextSentence")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("passageId", "headword") DO UPDATE SET
         "lookedUpAt" = CURRENT_TIMESTAMP,
         "selectedText" = EXCLUDED."selectedText",
         "contextSentence" = COALESCE(EXCLUDED."contextSentence", "WordLookup"."contextSentence")
       RETURNING "id", "passageId", "headword", "selectedText", "contextSentence", "lookedUpAt"
     )
     SELECT ${COLUMNS} FROM l LEFT JOIN "DictionaryEntry" d ON d."headword" = l."headword"`,
    [input.userId, input.passageId, input.headword, input.selectedText, input.contextSentence],
  );
  return rows[0];
}

/** The passage's lookups, most recent first. */
export async function listLookups(userId: string, passageId: string, db: Queryable = pool): Promise<WordLookup[]> {
  const { rows } = await db.query<WordLookup>(
    `SELECT ${COLUMNS}
     FROM "WordLookup" l LEFT JOIN "DictionaryEntry" d ON d."headword" = l."headword"
     WHERE l."userId" = $1 AND l."passageId" = $2
     ORDER BY l."lookedUpAt" DESC, l."id" DESC`,
    [userId, passageId],
  );
  return rows;
}

export async function findLookup(userId: string, id: string, db: Queryable = pool): Promise<WordLookup | null> {
  const { rows } = await db.query<WordLookup>(
    `SELECT ${COLUMNS}
     FROM "WordLookup" l LEFT JOIN "DictionaryEntry" d ON d."headword" = l."headword"
     WHERE l."userId" = $1 AND l."id" = $2`,
    [userId, id],
  );
  return rows[0] ?? null;
}

export async function deleteLookup(userId: string, id: string, db: Queryable = pool): Promise<boolean> {
  const { rowCount } = await db.query(`DELETE FROM "WordLookup" WHERE "userId" = $1 AND "id" = $2`, [
    userId,
    id,
  ]);
  return (rowCount ?? 0) > 0;
}
