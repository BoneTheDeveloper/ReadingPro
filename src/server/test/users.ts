// Test data is owned by throwaway users. Deleting a "User" cascades to all its
// data, so tests never touch other rows.
import { randomUUID } from "node:crypto";
import { pool } from "@/server/lib/db";

type TestUserOverrides = { name?: string; tier?: "FREE" | "PRO" };

/** Inserts a `"User"` with an `@test.invalid` email; returns the id. */
export async function createTestUser(overrides: TestUserOverrides = {}): Promise<string> {
  const id = `test-${randomUUID()}`;
  await pool.query(
    `INSERT INTO "User" ("id", "name", "email", "emailVerified", "tier")
     VALUES ($1, $2, $3, true, $4)`,
    [id, overrides.name ?? "Test User", `${id}@test.invalid`, overrides.tier ?? "FREE"],
  );
  return id;
}

/** Deletes the given test users and, through the cascades, all of their data. */
export async function deleteTestUsers(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await pool.query(
    `DELETE FROM "User" WHERE "id" = ANY($1::text[]) AND "email" LIKE '%@test.invalid'`,
    [ids],
  );
  ids.length = 0;
}
