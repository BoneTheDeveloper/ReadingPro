// The only file that queries "UserProfile". A profile shares its id with the
// Better Auth "User" row and owns all of the user's app data.
import { pool, type Queryable } from "@/server/lib/db";

export type ProfileSettings = {
  timezone: string;
  desiredRetention: number;
  /** Optimized FSRS weights; null means the library defaults. */
  fsrsParams: unknown;
};

/** Creates the profile for a new user; a second call for the same user does nothing. */
export async function insertProfileIfMissing(userId: string, db: Queryable = pool): Promise<void> {
  await db.query(
    `INSERT INTO "UserProfile" ("id") VALUES ($1) ON CONFLICT ("id") DO NOTHING`,
    [userId],
  );
}

export async function findProfileSettings(
  userId: string,
  db: Queryable = pool,
): Promise<ProfileSettings | null> {
  const { rows } = await db.query<ProfileSettings>(
    `SELECT "timezone", "desiredRetention", "fsrsParams" FROM "UserProfile" WHERE "id" = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

/**
 * Locks the profile row until `tx` ends, serializing per-user writes such as
 * creating the default vocabulary set. Returns false when there is no profile.
 */
export async function lockProfile(userId: string, tx: Queryable): Promise<boolean> {
  const { rowCount } = await tx.query(
    `SELECT "id" FROM "UserProfile" WHERE "id" = $1 FOR UPDATE`,
    [userId],
  );
  return rowCount === 1;
}
