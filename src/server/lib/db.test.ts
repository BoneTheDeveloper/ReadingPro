import { afterEach, describe, expect, it } from "vitest";
import { isUniqueViolation, pool, withTransaction } from "@/server/lib/db";
import { createTestUser, deleteTestUsers } from "@/server/test/users";

const userIds: string[] = [];
afterEach(() => deleteTestUsers(userIds));

async function bioOf(userId: string): Promise<string | null> {
  const { rows } = await pool.query<{ bio: string | null }>(
    `SELECT "bio" FROM "UserProfile" WHERE "id" = $1`,
    [userId],
  );
  return rows[0].bio;
}

describe("withTransaction", () => {
  it("commits when the callback resolves", async () => {
    const userId = await createTestUser();
    userIds.push(userId);

    await withTransaction((tx) =>
      tx.query(`UPDATE "UserProfile" SET "bio" = 'kept' WHERE "id" = $1`, [userId]),
    );

    expect(await bioOf(userId)).toBe("kept");
  });

  it("rolls back and rethrows when the callback throws", async () => {
    const userId = await createTestUser();
    userIds.push(userId);

    await expect(
      withTransaction(async (tx) => {
        await tx.query(`UPDATE "UserProfile" SET "bio" = 'lost' WHERE "id" = $1`, [userId]);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await bioOf(userId)).toBeNull();
  });
});

describe("isUniqueViolation", () => {
  it("is true only for a unique constraint error", async () => {
    const userId = await createTestUser();
    userIds.push(userId);

    const duplicate = await pool
      .query(`INSERT INTO "UserProfile" ("id") VALUES ($1)`, [userId])
      .catch((error: unknown) => error);

    expect(isUniqueViolation(duplicate)).toBe(true);
    expect(isUniqueViolation(new Error("other"))).toBe(false);
  });
});
