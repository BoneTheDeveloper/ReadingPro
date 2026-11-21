// The only file that queries the app's own "User" columns. Better Auth owns the
// rest of the row and creates it; the settings columns get their defaults then.
import { pool, type Queryable } from "@/server/lib/db";

type UserSettings = {
  timezone: string;
  desiredRetention: number;
  /** Optimized FSRS weights; null means the library defaults. */
  fsrsParams: unknown;
};

export async function findUserSettings(
  userId: string,
  db: Queryable = pool,
): Promise<UserSettings | null> {
  const { rows } = await db.query<UserSettings>(
    `SELECT "timezone", "desiredRetention", "fsrsParams" FROM "User" WHERE "id" = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * Locks the user row until `tx` ends, serializing per-user writes such as
 * creating the default vocabulary set. Returns false when there is no user.
 */
export async function lockUser(userId: string, tx: Queryable): Promise<boolean> {
  const { rowCount } = await tx.query(`SELECT "id" FROM "User" WHERE "id" = $1 FOR UPDATE`, [
    userId,
  ]);
  return rowCount === 1;
}
