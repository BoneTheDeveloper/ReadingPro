import { pool } from "@/server/lib/db";

/**
 * Called before a password sign-up. An unverified, password-only user with the
 * same email is an abandoned sign-up: it never signed in (sign-in needs a
 * verified email), so it owns no data. Better Auth would otherwise keep it and
 * its old password and answer the new sign-up with a silent fake success.
 * Removing it lets the new sign-up start fresh with its own password.
 */
export async function deletePendingPasswordSignUp(email: string): Promise<void> {
  await pool.query(
    `DELETE FROM "User" u
     WHERE lower(u."email") = lower($1) AND NOT u."emailVerified"
       AND NOT EXISTS (
         SELECT 1 FROM "account" a WHERE a."userId" = u."id" AND a."providerId" <> 'credential'
       )`,
    [email.trim()],
  );
}

/**
 * Called when a Google account is attached to a user. If that user never
 * verified its email, the password on it may belong to someone who registered
 * an address they do not own. Google has now proved ownership, so the email
 * becomes verified and that unproven password is removed. A verified user is
 * left untouched. Returns whether a password was removed.
 */
export async function claimUnverifiedUserForOAuth(userId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const claimed = await client.query(
      `UPDATE "User" SET "emailVerified" = true, "updatedAt" = now()
       WHERE "id" = $1 AND NOT "emailVerified"`,
      [userId],
    );
    let removed = false;
    if (claimed.rowCount) {
      const deleted = await client.query(
        `DELETE FROM "account" WHERE "userId" = $1 AND "providerId" = 'credential'`,
        [userId],
      );
      removed = (deleted.rowCount ?? 0) > 0;
    }
    await client.query("COMMIT");
    return removed;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
