import { pool, type Queryable } from "@/server/lib/db";
import type { DictionaryEntry } from "@/shared/dictionary/schema";

/** The entries among `headwords` (lowercased keys) that exist, in no particular order. */
export async function findEntries(headwords: string[], db: Queryable = pool): Promise<DictionaryEntry[]> {
  if (headwords.length === 0) return [];
  const { rows } = await db.query<DictionaryEntry>(
    `SELECT "headword", "displayHeadword", "phonetic", "senses"
     FROM "DictionaryEntry" WHERE "headword" = ANY($1::text[])`,
    [headwords],
  );
  return rows;
}
