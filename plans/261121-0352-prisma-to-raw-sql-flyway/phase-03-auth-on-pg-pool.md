---
phase: 3
title: "Phase 3: Better Auth on the pg pool and the profile module"
status: done
priority: P1
effort: "3h"
dependencies: [2]
---

# Phase 3: Better Auth on the pg pool and the profile module

## Overview

Point Better Auth at the shared `pg.Pool` through its built-in Kysely adapter.
Move every `"UserProfile"` query into a new `profile` module. That module is
used by the auth hook here and by vocabulary in phase 5. Auth tables keep their
names and data shape. Flyway owns them, and Better Auth's CLI is used only to
confirm that nothing is missing.

## Context Links

- `src/server/modules/auth/auth.ts` (adapter, `additionalFields.tier`, `databaseHooks`)
- `src/server/middleware/require-session.ts` and `src/server/env.ts` (consumers of the session type; no change expected)
- Better Auth docs, PostgreSQL adapter: https://github.com/better-auth/better-auth/blob/main/docs/content/docs/adapters/postgresql.mdx

## Requirements

- [x] `auth.ts` sets `database: pool` and `user.modelName: "User"`, and no longer imports Prisma.
- [x] Every other Better Auth option stays the same: `baseURL`, Google provider, `oAuthProxy`, `trustedOrigins`, account linking, the `tier` field, and the session and cookie cache settings.
- [x] The user-create hook calls the profile module. It does not contain SQL itself.
- [x] `src/server/modules/profile/` provides:
  - `profile-repository.ts`, the only file that queries `"UserProfile"`
  - `index.ts`, the public API
- [x] The profile repository provides:
  - `insertProfileIfMissing(userId, db?)`: `INSERT ... ON CONFLICT ("id") DO NOTHING`
  - `findProfileSettings(userId, db?)`: `timezone`, `desiredRetention`, `fsrsParams`
  - `lockProfile(userId, tx)`: `SELECT "id" ... FOR UPDATE`
- [x] Better Auth's CLI reports that the schema is up to date against the migrated DB.

## Files

- Create: `src/server/modules/profile/profile-repository.ts`
- Create: `src/server/modules/profile/index.ts`
- Create: `src/server/modules/auth/auth.test.ts`
- Modify: `src/server/modules/auth/auth.ts`
- No ESLint change: the boundary rule matches `@/server/modules/*/*` (`eslint.config.mjs:57`), so the new module is covered.

## Implementation Steps

1. Write the profile repository and its `index.ts`. Each function takes `db: Queryable = pool` as its last parameter.
2. In `auth.ts`:
   - Import `pool` from `@/server/lib/db`.
   - Set `database: pool`.
   - Add `modelName: "User"` beside `additionalFields` under `user`.
   - In `databaseHooks.user.create.after`, call `insertProfileIfMissing(user.id)`.
3. Run Better Auth's CLI against the migrated dev DB, with `DATABASE_URL` pointing to it. <!-- Red Team: pin the CLI version and add a manual fallback -->
   - Pin the CLI to the installed `better-auth` version, read from `pnpm list better-auth` (1.7.6 today), for example `pnpm dlx auth@<version> generate`. Do not use `@latest`, because a newer CLI may expect columns that 1.7.6 does not use.
   - Expected result: no changes to apply.
   - If the CLI cannot load `auth.ts`, for example because it does not resolve the `@/` alias, compare V1 by hand. Check the `"User"`, `account`, `session` and `verification` columns against the core schema in the Better Auth database docs for that version, plus `tier`.
   - If it proposes columns, compare them with V1. Fix V1 if this is a real gap; nothing is in production yet, so editing V1 and recreating the volume is allowed until phase 6 ships.
   - Never run `npx auth migrate`.
4. Write `auth.test.ts`. It uses `(await auth.$context).internalAdapter`, which writes through the same adapter as the Google flow without needing OAuth.
   - Users get an `@test.invalid` email, and `afterEach` deletes them, as described in phase 2.
   - `createUser({ name, email, emailVerified: true })` writes a `"User"` row with `tier = 'FREE'`, and the hook creates the `"UserProfile"` row.
   - `createSession(user.id)` followed by `findSession(token)` returns the user. `expiresAt` is within 7 days ± 1 minute of now. The suite runs with `TZ=Asia/Bangkok` (phase 2), so this proves the `timestamptz` fix.
   - Deleting the `"User"` row cascades to `"UserProfile"`, `session` and `account`.
   - Confirm the exact `internalAdapter` method signatures from the installed types before writing the test.
5. Manual check: start `pnpm dev` against the Docker DB, sign in with Google on `http://localhost:3000`, and confirm the rows in `"User"`, `account`, `session` and `"UserProfile"`.

## Todo

- [x] Profile module
- [x] `auth.ts` on the pg pool
- [x] CLI schema check
- [x] `auth.test.ts`
- [ ] Manual Google sign-in (left to the user: needs a browser and the user's Google account)

## Implementation Notes

- `pnpm dlx auth@1.7.6 generate --config src/server/modules/auth/auth.ts` against the migrated DB printed "Your schema is already up to date." Against an empty database the same command proposed `"User"` (with `tier`), `session`, `account` and `verification` with `timestamptz` columns, which shows it loaded this config and read the DB.
- better-auth 1.7.6 `internalAdapter.createUser(user, source)` needs a provisioning source; the test passes `{ method: "oauth", oauth: { providerId: "google" } }` like the Google flow.
- The session test also checks `"expiresAt" - now()` in SQL. The DB runs in UTC and the suite in Asia/Bangkok, so a column without a time zone would be 7 hours off there; a JS-only round trip would not catch it.

## Success Criteria

- `pnpm test src/server/modules/auth` passes.
- Google sign-in works locally, and a second sign-in reuses the same `"User"` row.
- `grep -n prisma src/server/modules/auth/auth.ts` finds nothing.

## Risks

- `cookieCache` with `strategy: "compact"` does not touch the DB, so it is unaffected.
- `oAuthProxy` stores state in `verification`. Its columns match the Better Auth defaults (`0_init/migration.sql:73`).
