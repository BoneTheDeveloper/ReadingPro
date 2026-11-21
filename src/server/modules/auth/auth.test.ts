// Drives Better Auth's internal adapter, which writes through the same Kysely
// adapter and hooks as the Google sign-in flow, without needing OAuth.
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { pool } from "@/server/lib/db";
import { deleteTestUsers } from "@/server/test/users";
import { auth } from "./auth";

const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function createAuthUser() {
  const { internalAdapter } = await auth.$context;
  const user = await internalAdapter.createUser(
    { name: "Auth Test", email: `auth-${randomUUID()}@test.invalid`, emailVerified: true },
    { method: "oauth", oauth: { providerId: "google" } },
  );
  userIds.push(user.id);
  return user;
}

async function countRows(table: string, column: string, userId: string): Promise<number> {
  const { rows } = await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS "count" FROM "${table}" WHERE "${column}" = $1`,
    [userId],
  );
  return rows[0].count;
}

describe("Better Auth on the pg pool", () => {
  it("creates a FREE user and its profile through the create hook", async () => {
    const user = await createAuthUser();

    const { rows } = await pool.query<{ tier: string | null }>(
      `SELECT "tier" FROM "User" WHERE "id" = $1`,
      [user.id],
    );
    expect(rows[0].tier).toBe("FREE");
    expect(await countRows("UserProfile", "id", user.id)).toBe(1);
  });

  it("finds a created session with a seven-day expiry", async () => {
    const { internalAdapter } = await auth.$context;
    const user = await createAuthUser();

    const session = await internalAdapter.createSession(user.id);
    const found = await internalAdapter.findSession(session.token);

    expect(found?.user.id).toBe(user.id);
    const expiresAt = new Date(found!.session.expiresAt).getTime();
    expect(Math.abs(expiresAt - (Date.now() + SEVEN_DAYS_MS))).toBeLessThan(60_000);

    // The suite runs in Asia/Bangkok while the database runs in UTC. A column
    // without a time zone would store Bangkok wall time and put this 7h off.
    const { rows } = await pool.query<{ seconds: number }>(
      `SELECT EXTRACT(EPOCH FROM "expiresAt" - now())::int AS "seconds" FROM "session" WHERE "token" = $1`,
      [session.token],
    );
    expect(Math.abs(rows[0].seconds * 1000 - SEVEN_DAYS_MS)).toBeLessThan(60_000);
  });

  it("cascades a user delete to the profile, sessions and accounts", async () => {
    const { internalAdapter } = await auth.$context;
    const user = await createAuthUser();
    await internalAdapter.createSession(user.id);
    await internalAdapter.linkAccount({
      userId: user.id,
      providerId: "google",
      accountId: `google-${randomUUID()}`,
    });
    expect(await countRows("session", "userId", user.id)).toBe(1);
    expect(await countRows("account", "userId", user.id)).toBe(1);

    await pool.query(`DELETE FROM "User" WHERE "id" = $1`, [user.id]);

    expect(await countRows("UserProfile", "id", user.id)).toBe(0);
    expect(await countRows("session", "userId", user.id)).toBe(0);
    expect(await countRows("account", "userId", user.id)).toBe(0);
  });
});
