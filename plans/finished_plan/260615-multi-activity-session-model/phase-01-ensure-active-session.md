---
phase: 1
title: "Backend: @@map fix + lastActivityAt + advisory-lock ensure + backstop index"
status: completed
priority: P1
effort: "4h"
dependencies: []
---

# Phase 1: Backend — `@@map` fix + advisory-lock one-open-session

<!-- Updated: Validation Session 1 - advisory lock, 10-min idle, lastActivityAt rename -->

## Overview
Fix the live 500 (`relation "study_sessions" does not exist`) via `@@map`, rename the
activity timestamp to `lastActivityAt`, and make `ensureActiveSession` serialize per-user
with a transaction-level **advisory lock** so exactly one open session exists per user. A
partial unique index stands as a backstop. This makes Phase 3's daily time sums honest.

## Key insight
`ensureActiveSession` / `closeStaleStudySessions` / the idle constant already exist in the
live code — this phase **reshapes** them (adds the advisory lock, renames the column, bumps
idle to 10 min), it does not build them from scratch. The init migration is fresh +
uncommitted, so it regenerates cleanly. There is an existing `P2002` precedent
(`vocabulary-set-queries.ts:190`), but the hot path here uses the lock instead of catch/retry.

## Requirements
- Functional:
  - `study_sessions` table exists (snake_case) → raw SQL resolves; `POST /api/study-session`
    returns 200.
  - `ensureActiveSession(userId)` runs in one `db.$transaction`: advisory lock → sweep stale
    (idle > 10 min) → reuse the open session, else create one. Returns exactly one open row.
  - At most one `study_sessions` row per `userId` with `completedAt IS NULL` (backstop index).
  - Concurrent ensure-calls (multi-tab/device) collapse to ONE open session via the lock — no
    error surfaced, no retry.
  - Heartbeat bumps `lastActivityAt = now` on the open session.
- Non-functional: lazy close only (no cron); server `now()` for idle comparison; advisory
  lock auto-releases on commit/rollback.

## Architecture
```
schema: model StudySession {
  ... startedAt, lastActivityAt DateTime @default(now()), completedAt DateTime?
  @@index([userId, startedAt]) @@map("study_sessions")
}

migration (regenerated init), after table + indexes:
  CREATE UNIQUE INDEX "study_sessions_one_open_per_user"
    ON "study_sessions"("userId") WHERE "completedAt" IS NULL;   -- backstop

const SESSION_IDLE_MS = 10 * 60 * 1000;

ensureActiveSession(userId):  // db.$transaction(async (tx) => { ... })
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'study_session:'+userId})::bigint)`
  // sweep: close idle open sessions
  await tx.$executeRaw`UPDATE "study_sessions"
        SET "completedAt" = "lastActivityAt"
        WHERE "userId" = ${userId} AND "completedAt" IS NULL
          AND "lastActivityAt" < ${idleCutoff}`
  open = tx.studySession.findFirst({ where: { userId, completedAt: null } })
  if open -> tx.studySession.update({ where:{id:open.id}, data:{ lastActivityAt: now } })
  else     -> tx.studySession.create({ data:{ userId, startedAt: now, lastActivityAt: now } })
```
Prisma can't express the partial unique index → raw SQL in the migration. No `P2002` catch in
the normal path; the lock prevents the collision.

## Related Code Files
- Modify: `prisma/schema.prisma` — add `@@map("study_sessions")`; rename `lastSeenAt` →
  `lastActivityAt` on `StudySession`.
- Regenerate: `prisma/migrations/<ts>_init/migration.sql` — table → `study_sessions`,
  `lastActivityAt` column, `quiz_attempts` FK retargets, + append the partial unique index.
- Modify: `src/lib/db/study-session-queries.ts` — `SESSION_IDLE_MS = 10*60*1000`; add the
  advisory lock at tx top; rename `lastSeenAt` → `lastActivityAt` in `createStudySession`,
  `closeStaleStudySessions`, `ensureActiveSession`.
- Modify: `src/lib/study/shared/study-response-schema.ts` — rename `lastSeenAt` if surfaced
  in the StudySession DTO.
- Modify: `src/lib/db/study-session-queries.test.ts` — rename refs; add the advisory-lock
  call assertion + the "concurrent ensure returns one open session" expectation; keep
  reuse/create/close cases green.

## Implementation Steps
1. Rename `lastSeenAt` → `lastActivityAt` and add `@@map("study_sessions")` in `schema.prisma`.
2. Regenerate init migration: `pnpm prisma migrate reset --force` then
   `pnpm prisma migrate dev --name init`.
3. Append the backstop partial unique index to the generated SQL and re-apply.
4. Update `study-session-queries.ts`: bump idle to 10 min, add `pg_advisory_xact_lock` as the
   first statement inside the existing `db.$transaction`, rename column refs in the raw SQL +
   Prisma calls.
5. Update the schema/DTO + tests for the rename; add lock + single-open-session tests.
6. Run verification commands.

## Success Criteria
- [ ] `POST /api/study-session` returns 200 (no `42P01`).
- [ ] `ensureActiveSession` issues `pg_advisory_xact_lock` before the sweep/select.
- [ ] Backstop index exists; DB rejects a 2nd open row for a user.
- [ ] Idle > 10 min closes a session with `completedAt = lastActivityAt`.
- [ ] No `lastSeenAt` references remain in code or tests.
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` pass.

## Risk Assessment
- Regenerating init drops local data — acceptable (fresh, uncommitted, no prod). Confirm no
  other uncommitted migration depends on the old table/column name before reset.
- Manual SQL (index) in a Prisma-generated migration can be lost on a later regenerate —
  document it in the migration; re-add if regenerated.
- Advisory-lock key collisions: `hashtext` is 32-bit; cast to bigint is fine. Keying on
  `'study_session:'||userId` namespaces it from any other advisory lock.
- The lock is held for the duration of the (short) transaction — negligible contention for
  per-user serialization; never lock across an external call.
