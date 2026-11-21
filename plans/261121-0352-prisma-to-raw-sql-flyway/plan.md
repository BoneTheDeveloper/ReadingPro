---
title: "Migrate from Prisma to raw SQL with Flyway and local Docker Postgres"
description: "Replace Prisma with node-postgres raw SQL behind per-module repositories, move schema ownership to Flyway, run Postgres locally in Docker, and keep Better Auth and every current feature working."
status: in-progress
priority: P1
effort: 3d
branch: bone/refactor/prisma-to-raw-sql
tags: [refactor, database, backend, auth, infra, tech-debt]
blockedBy: []
blocks: []
created: 2026-11-21
---

# Migrate from Prisma to raw SQL with Flyway and local Docker Postgres

## Overview

Replace Prisma with node-postgres (`pg`) raw SQL behind per-module repositories.
Flyway owns the whole schema, including the Better Auth tables. Postgres runs
locally in Docker. Better Auth moves from `prismaAdapter` to its built-in Kysely
adapter, fed the same `pg.Pool` as the app (better-auth 1.7.6 in `pnpm-lock.yaml`
already depends on `@better-auth/kysely-adapter`).

Production holds no data worth keeping, so `V1__init.sql` is the final schema
written once. There is no `flyway baseline` step.

## Contract

- **Outcome:** The app behaves as it does today: Google sign-in, passages, studio
  artifacts, chat, vocabulary, sets and FSRS review. It runs on `pg` raw SQL
  with no Prisma file, package, script or generated client left. Each server
  module keeps SQL only in `*-repository.ts` and business rules only in
  services. `pnpm db:up` and `pnpm db:migrate` give a working local database.
- **Constraints:**
  - Table and column names stay as they are, including the capitalized `"User"`
    table (Better Auth uses `modelName: "User"`).
  - The error envelope, `AppError` reasons, the module `index.ts` boundaries and
    the eslint import rules stay as they are.
  - Every phase leaves `pnpm typecheck` and `pnpm lint` green.
  - No secrets are committed. The compose credentials are local-only dev values.
  - Local Postgres binds `127.0.0.1:54329`, because 5432 and 5433 are already
    taken on the dev machine.
- **Non-goals:**
  - Renaming tables or moving auth tables to their own schema.
  - Adding a query builder or ORM. Kysely stays internal to Better Auth.
  - Running Flyway in CI or in the Vercel build.
  - Adding new features or new auth providers.
- **Acceptance criteria:**
  1. Auth and every current feature work against the Docker database. This is
     proven by Vitest integration tests and the manual smoke checklist in phase 6.
  2. `grep -rIi prisma` over tracked files outside `plans/` and `pnpm-lock.yaml`
     finds nothing. `pnpm why @prisma/client prisma` reports nothing.
  3. No service or route file imports `@/server/lib/db` for queries. Every SQL
     string lives in a `*-repository.ts` file. Repositories never throw `AppError`.
  4. `compose.yaml` defines Postgres and Flyway. `pnpm db:up && pnpm db:migrate`
     on an empty volume ends with `flyway info` showing V1 as `Success`.

## Decisions (validation session 1)

| Topic | Decision | Effect |
|---|---|---|
| Production data | Not important, no baseline | V1 is the final schema; prod is recreated with Flyway (manual, confirmed step) |
| Timestamps | `timestamptz` everywhere | `node-pg` reads instants correctly in any `TZ`; no type-parser hack |
| `ProcessingStatus` labels | Uppercase in the DB | SQL uses `'PENDING'` etc. directly; no mapping in repositories |
| Verification | Vitest integration tests on the dev DB, no separate test DB (session 2) | New dev dependency `vitest`; each test creates `@test.invalid` users and deletes them, and cascades remove their data; nothing is truncated |
| Local port | `127.0.0.1:54329` (session 2) | Avoids the two existing Docker Postgres containers on 5432 and 5433; can be changed with `POSTGRES_PORT` |

## Architecture

```
routes ──▶ service ──▶ repository ──▶ src/server/lib/db.ts (pg.Pool, withTransaction)
             │  owns AppError,          owns SQL only,
             │  transactions,           returns rows / null / boolean,
             │  business rules          takes optional `db: Queryable`
             └─ cross-module calls only through the module's index.ts

Better Auth ──▶ same pg.Pool (built-in Kysely adapter) ──▶ "User", account, session, verification
     └─ databaseHooks.user.create.after ──▶ profile module ──▶ "UserProfile"

db/migrations/V*.sql ──(Flyway container)──▶ Postgres container
```

## Phases

| # | Phase | Effort | Depends on | Status |
|---|-------|--------|------------|--------|
| 1 | [Docker Postgres, Flyway and the V1 schema](./phase-01-docker-postgres-flyway.md) | 3h | none | Done |
| 2 | [DB access layer and Vitest harness](./phase-02-db-layer-and-vitest.md) | 3h | 1 | Done |
| 3 | [Better Auth on the pg pool and the profile module](./phase-03-auth-on-pg-pool.md) | 3h | 2 | Done |
| 4 | [Passage, artifact and chat repositories](./phase-04-passage-artifact-chat-repositories.md) | 4h | 2 | Done |
| 5 | [Vocabulary items, sets and review repositories](./phase-05-vocabulary-repositories.md) | 6h | 3, 4 | Pending |
| 6 | [Remove Prisma, update docs, final verification](./phase-06-remove-prisma-and-verify.md) | 3h | 3, 4, 5 | Pending |

The app's runtime is broken between phases 1 and 5 for modules that still use
Prisma, because Prisma maps `ProcessingStatus` to lowercase labels that V1 no
longer has. Typecheck and lint stay green, and tests cover the migrated
modules. Full runtime behavior returns at the end of phase 5.

## Risks

| Risk | Mitigation |
|---|---|
| `pg` sends JS arrays as Postgres arrays, which breaks `jsonb` writes | Repositories always pass `JSON.stringify(value)` for `jsonb` and cast `$n::jsonb`; covered by an artifact progress test with an array |
| `COUNT(*)` returns `bigint`, which `pg` reads as a string | Every count is cast `::int` |
| Prisma threw `P2025` (a 500) on an update or delete of a missing row; raw SQL silently affects 0 rows | Repositories return `null` or `false`, and services throw the module's existing `*.not_found` reason (now a 404) |
| Importing services in tests pulls in `workflow/api` | If the import fails outside the Nitro build, `vi.mock("workflow/api")` in the affected test files |
| Docker socket needs permission on this machine | The user runs `pnpm db:*` with a docker-enabled account (`docker` group or `sudo`) |
| Better Auth expects a column the V1 schema lacks | Phase 3 runs the Better Auth CLI, pinned to the installed version, against the migrated DB and requires "no changes"; a manual column check is the fallback |
| Tests share the dev DB with the user's own data | Tests delete only `@test.invalid` users they created, never truncate, and refuse a non-local `DATABASE_URL` |

## Success Criteria

- [ ] Acceptance criterion 1: integration tests pass and the smoke checklist is done
- [ ] Acceptance criterion 2: no Prisma traces
- [ ] Acceptance criterion 3: SQL only in repositories
- [ ] Acceptance criterion 4: Docker Postgres and Flyway work from an empty volume
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm exec knip`, `pnpm test`, `pnpm build` are all green

## Validation Log

### Session 1 — 2026-11-21

Questions asked before drafting, with answers:
1. Production data to keep? **No important data**, so there is no baseline and V1 is the final schema.
2. Timestamp handling? **Migrate to `timestamptz`.**
3. `ProcessingStatus` lowercase labels? **Rename to uppercase in the DB.**
4. Verification approach? **Add Vitest integration tests.**

### Verification Results
- Claims checked: 18. Verified: 18. Failed: 0. Unverified: 0. Tier: Full.
- Prisma consumers are the 8 files listed in phases 3 to 5 (`grep -rln "lib/prisma" src`).
- Generated-enum importers are the 6 files listed in phases 2 and 4.
- `ProcessingStatus` DB labels are lowercase (`prisma/migrations/0_init/migration.sql:20`).
- All timestamps are `TIMESTAMP(3)` without a time zone (`0_init/migration.sql`).
- `"User"` is capitalized and the other auth tables are lowercase (`0_init/migration.sql:26,45,59,73`).
- The Kysely adapter ships with better-auth 1.7.6 (`pnpm-lock.yaml:8707`).
- Ports 5432 and 5433 are in use (`ss -ltn`).
- `@types/pg` and `vitest` are not direct dependencies (`package.json`).

### Session 2 — 2026-11-21

1. Local port? **`54329`.** The user confirmed it after checking that 5432 and 5433 belong to other Docker Postgres containers.
2. Separate test database? **No.** Tests run on the dev DB and clean up only their own `@test.invalid` users. Phases 1, 2, 4, 5 and 6 were updated.

## Red Team Review

Done inline with four lenses: security, assumptions, failure modes, and scope. The user applied the accepted findings; finding 1 was resolved by the session 2 test-DB decision.

| # | Severity | Finding | Evidence | Disposition |
|---|---|---|---|---|
| 1 | Critical | A missing test URL would make `TRUNCATE` hit the dev DB | `.env.example:16` | Accept (modified): no TRUNCATE at all; tests delete only their own users and refuse a non-local URL (phase 2) |
| 2 | High | The `auth@latest` CLI may not match better-auth 1.7.6 | `pnpm-lock.yaml:8705` | Accept: CLI pinned to the installed version (phase 3) |
| 3 | Medium | The CLI may not resolve the `@/` alias in `auth.ts` | `src/server/modules/auth/auth.ts:4` | Accept: manual column check as the fallback (phase 3) |
| 4 | Medium | Switching `.env` could strand the dev data in the user's current DB | `.env.example:16`; `docker-proxy` on 5432 | Accept: back up before switching; Flyway's URL is fixed to the compose DB (phase 1) |
| 5 | Medium | An open pool can hang Vitest; `TZ` was set only in one file | `src/server/lib/prisma.ts:8` | Accept: `afterAll(pool.end)` and a suite-wide `TZ` (phase 2) |
| 6 | Medium | Pool size on Vercel serverless | `src/server/lib/prisma.ts:4` | Reject: Prisma's adapter already used a default `pg.Pool` |
| 7 | Medium | Credentials in `compose.yaml` | phase 1 step 1 | Reject: dev-only values, bound to `127.0.0.1` |
| 8 | Medium | `Queryable` may not accept `PoolClient` | phase 2 step 2 | Reject: the plan already gives the fallback type |
| 9 | Medium | A swallowed unique violation could leave a transaction open | `src/server/modules/vocabulary/review/review-service.ts:231` | Reject: `withTransaction` rolls back before rethrowing |

### Whole-Plan Consistency Sweep
- After red team and session 2, no plan file mentions `readingpro_test`, `db:migrate:test`, `TEST_DATABASE_URL`, `resetDatabase`, `TRUNCATE` for tests, or an unpinned `auth@latest`.
- All phases use the same names: `Queryable`, `withTransaction`, `isUniqueViolation`
  from `src/server/lib/db.ts`, the profile module at `src/server/modules/profile/`,
  migrations under `db/migrations/`, and port `54329`.
- No phase still refers to a baseline step, a `pg` type parser, or lowercase status mapping.
