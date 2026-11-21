---
phase: 2
title: "Phase 2: DB access layer and Vitest harness"
status: done
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 2: DB access layer and Vitest harness

## Overview

Add the single database entry point, `src/server/lib/db.ts`, and an integration
test harness that runs on the dev database `readingpro`, with no separate test
database. Tests stay isolated by ownership:
- Each test creates its own users with an `@test.invalid` email.
- Each test deletes those users afterwards. `ON DELETE CASCADE` from `"User"`
  then removes everything they own.
- Nothing is ever truncated.

Replace the type-only enum guard, which depends on Prisma's generated enums,
with a test that compares `src/shared/enums.ts` against `pg_enum`.

## Context Links

- `src/server/lib/prisma.ts` (singleton pattern and `isUniqueViolation` to port)
- `src/server/lib/enum-sync.ts` (the guard being replaced)
- `vite.config.ts` (the `@` alias Vitest must reuse)
- Cascade chain:
  - `"User"` → `"UserProfile"` (`0_init`)
  - `"UserProfile"` → `Passage`, `VocabularySet`, `VocabularyItem` and `ReviewSession`
  - `Passage` → `StudioArtifact` and `ChatMessage`
  - `VocabularyItem` → `ReviewLog`
  - Deleting a profile removes its sets and its words in the same statement, so the `NO ACTION` between them does not block it (schema comment on `VocabularyItem.vocabularySet`).

## Requirements

- [x] `db.ts` exports:
  - the pool, cached on `globalThis` outside production, as `prisma.ts` does today
  - `type Queryable`, which both a `Pool` and a `PoolClient` satisfy
  - `withTransaction(fn)`: BEGIN, COMMIT, ROLLBACK on throw, and the client is always released
  - `isUniqueViolation(error)`: true for SQLSTATE `23505`
  - `type JsonValue`, which replaces `Prisma.InputJsonValue`
- [x] The rules for repository authors are written once, as a doc comment in `db.ts`:
  - Always list columns explicitly; never `SELECT *`.
  - Send `jsonb` as `JSON.stringify(value)` with `$n::jsonb`.
  - Cast every `COUNT(*)` with `::int`.
  - Set `"updatedAt" = now()` on every UPDATE of a table that has the column.
- [x] `pnpm test` runs Vitest against `DATABASE_URL` from `.env`, one file at a time.
- [x] Tests never delete a row that a test did not create. The only delete is `DELETE FROM "User" WHERE "email" LIKE '%@test.invalid'`, plus deletes by the ids a test created. <!-- Red Team + validation session 2: no test DB, no TRUNCATE -->
- [x] Global setup does three things before any test runs:
  - fails fast with "run pnpm db:up && pnpm db:migrate" when V1 is missing from `flyway_schema_history`
  - refuses to run unless the host is `localhost` or `127.0.0.1`, so a production URL in `.env` can never be used by the tests
  - removes the `@test.invalid` users left behind by an interrupted run
- [x] Every test runs with `TZ=Asia/Bangkok`, so the timestamp fix is checked everywhere. The pool is closed after each file. <!-- Red Team: TZ for the whole suite, close the pool -->
- [x] The enum drift test covers all 7 enums in `src/shared/enums.ts`.

## Files

- Create: `src/server/lib/db.ts`
- Create: `vitest.config.ts`
- Create: `src/server/test/global-setup.ts`
- Create: `src/server/test/setup.ts` (`afterAll(() => pool.end())`)
- Create: `src/server/test/users.ts`:
  - `createTestUser(overrides?)`: inserts a `"User"` with id `test-<uuid>` and email `<id>@test.invalid`, plus its `"UserProfile"`, and returns the id
  - `deleteTestUsers(ids)`: deletes those users
- Create: `src/server/lib/enum-sync.test.ts`
- Delete: `src/server/lib/enum-sync.ts`
- Modify: `package.json`:
  - add `"test": "vitest run"`
  - add dev dependencies `vitest` and `@types/pg`
- Modify: `knip.json` (remove the `enum-sync.ts` entry; knip's Vitest plugin finds the test files)

## Implementation Steps

1. Run `pnpm add -D vitest @types/pg`.
2. Write `db.ts`:
   ```ts
   import pg from "pg";           // pg is CommonJS: default import, then destructure

   const globalForDb = globalThis as unknown as { pool?: pg.Pool };
   export const pool = globalForDb.pool ?? new pg.Pool({ connectionString: process.env.DATABASE_URL });
   if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

   export type Queryable = Pick<pg.Pool, "query">;   // PoolClient has the same `query`

   export async function withTransaction<T>(fn: (tx: pg.PoolClient) => Promise<T>): Promise<T> {
     const client = await pool.connect();
     try {
       await client.query("BEGIN");
       const result = await fn(client);
       await client.query("COMMIT");
       return result;
     } catch (error) {
       await client.query("ROLLBACK");
       throw error;
     } finally {
       client.release();
     }
   }

   export function isUniqueViolation(error: unknown): boolean {
     return error instanceof pg.DatabaseError && error.code === "23505";
   }
   ```
   If `pg.PoolClient` is not assignable to `Queryable`, widen it to `Pick<pg.PoolClient, "query">`.
3. Write `vitest.config.ts`:
   - Reuse the `@` alias.
   - Set `environment: "node"`, `globalSetup: "src/server/test/global-setup.ts"`, `setupFiles: ["src/server/test/setup.ts"]` and `fileParallelism: false`.
   - Set `test.env: { TZ: "Asia/Bangkok" }`.
   - Load `.env` with `dotenv`.
4. Write `global-setup.ts`:
   - Parse `DATABASE_URL` and require the host to be `localhost` or `127.0.0.1`.
   - Check `flyway_schema_history` for V1.
   - Delete the leftover `@test.invalid` users.
   - Use its own `pg.Client`, and close it.
5. Every test file that creates data collects the user ids it creates, and calls `deleteTestUsers(ids)` in `afterEach`. Assertions always filter by those user ids, never by a table-wide count.
6. Write `enum-sync.test.ts`:
   - Query `SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid ORDER BY t.typname, e.enumsortorder`.
   - Assert that each of the 7 shared enums equals its labels, in order.
7. Delete `enum-sync.ts`. Update the header comment of `src/shared/enums.ts` so it points to the test and the DB enums, not to Prisma.

## Todo

- [x] Dependencies installed
- [x] `db.ts`
- [x] Vitest config, global setup, setup file, test-user helpers
- [x] Enum drift test replaces `enum-sync.ts`
- [x] Shared enums comment updated

## Implementation Notes

- `vitest` 5.1.1 and `@types/pg` 8.23.1. `Queryable` is `Pick<pg.Pool, "query"> | Pick<pg.PoolClient, "query">`.
- `vitest.config.ts` sets `process.env.TZ` before workers start as well as `test.env.TZ`, and limits `include` to `src/**/*.test.ts`.
- Added `src/server/lib/db.test.ts`: commit, rollback-and-rethrow, and `isUniqueViolation`.
- `dotenv` does not override variables that are already set, so `DATABASE_URL=postgres://readingpro:readingpro@localhost:54329/readingpro pnpm test` works while `.env` still points elsewhere. With the Neon URL from `.env`, global setup refuses to run before it connects.
- Checked once: renaming `ProcessingStatus.FAILED` to `FAILURE` fails the enum test; reverted.
- `pnpm exec knip` reports `Queryable` and `JsonValue` as unused until phases 3 and 4 use them.

## Success Criteria

- `pnpm test` passes.
- After the run, `SELECT count(*) FROM "User" WHERE email LIKE '%@test.invalid'` is 0, and the row counts of the user's own dev data are unchanged.
- Renaming one label in `src/shared/enums.ts` makes the enum test fail. Check this once, then revert.
- `pnpm typecheck` and `pnpm lint` are green.
