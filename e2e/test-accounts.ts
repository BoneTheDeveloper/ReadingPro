// Throwaway accounts for browser tests and manual checks, on the local
// database only. Their emails end in @test.invalid, so `pnpm test` removes them
// with the other test users; `pnpm db:seed-test-accounts` or `pnpm test:e2e`
// creates them again. Relative `.ts` imports only: scripts/seed-test-accounts.ts
// runs this file under plain Node.
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import pg from "pg";
import { requireLocalDatabaseUrl } from "../src/server/lib/database-url.ts";

/** Shared by every test account; local test data only, never a real credential. */
export const TEST_PASSWORD = "e2e-pass-123";

export const TEST_ACCOUNTS = {
  free: { login: "e2e_free", email: "e2e-free@test.invalid", name: "E2E Free", tier: "FREE" },
  pro: { login: "e2e_pro", email: "e2e-pro@test.invalid", name: "E2E Pro", tier: "PRO" },
} as const;

export type TestAccount = (typeof TEST_ACCOUNTS)[keyof typeof TEST_ACCOUNTS];

/** Every account gets these passages; the first is the newest, so /study opens it. */
const TEST_PASSAGES = [
  {
    title: "Dictionary check",
    content:
      "Every evening she looks after her little brother while their parents work.\n\n" +
      "He was running to the station because the train went early. The children studies were interesting.",
  },
  {
    title: "Second passage",
    content: "The weather was calm, and the boats stayed in the harbour all day.",
  },
] as const;

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * Recreates the test accounts from scratch: email-verified, with a password,
 * a username and the sample passages. Removing the old rows first cascades to
 * everything the last run left behind (lookups, saved words, sessions).
 */
export async function seedTestAccounts(): Promise<void> {
  const client = new pg.Client({ connectionString: requireLocalDatabaseUrl() });
  await client.connect();
  try {
    await client.query("BEGIN");
    const accounts = Object.values(TEST_ACCOUNTS);
    await client.query(`DELETE FROM "User" WHERE "email" = ANY($1::text[]) AND "email" LIKE '%@test.invalid'`, [
      accounts.map((account) => account.email),
    ]);

    const passwordHash = await hashPassword(TEST_PASSWORD);
    for (const account of accounts) {
      const userId = `test-${randomUUID()}`;
      await client.query(
        `INSERT INTO "User" ("id", "name", "email", "emailVerified", "tier", "username", "displayUsername")
         VALUES ($1, $2, $3, true, $4, $5, $5)`,
        [userId, account.name, account.email, account.tier, account.login],
      );
      await client.query(
        `INSERT INTO "account" ("id", "accountId", "providerId", "userId", "password")
         VALUES ($1, $2, 'credential', $2, $3)`,
        [randomUUID(), userId, passwordHash],
      );
      for (const [index, passage] of TEST_PASSAGES.entries()) {
        await client.query(
          `INSERT INTO "Passage" ("userId", "title", "content", "sourceType", "status", "wordCount", "cefrLevel", "createdAt")
           VALUES ($1, $2, $3, 'TEXT', 'COMPLETED', $4, 'A2', now() - $5 * interval '1 minute')`,
          [userId, passage.title, passage.content, wordCount(passage.content), index],
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}
