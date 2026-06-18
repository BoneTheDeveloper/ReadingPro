---
phase: 3
title: "Ensure-on-write fallback (TDD)"
status: pending
priority: P1
effort: "3h"
dependencies: [2]
---

# Phase 3: Ensure-on-write fallback (TDD)

## Overview

Once per-request `syncUser` is off the read path, a brand-new user could hit a
FK-dependent write (create vocabulary item, passage, session, upload, etc.) before the
`user.created` webhook lands → insert fails on missing `profiles` FK. Add an idempotent
`ensureUserProfile(userId)` and call it at the FK-creating write routes to close the race.

## Requirements

- Functional:
  - `ensureUserProfile(userId)`: idempotent `db.userProfile.upsert` with `create: { id: userId }`,
    empty `update: {}` (no-op if exists). Returns nothing meaningful; cheap, safe to repeat.
  - Called inside the **shared create modules** (not scattered across routes) so it runs
    immediately before every FK-dependent insert — impossible to forget on a new route.
  - Does NOT fetch from Clerk (identity already verified via `getUserId`); only guarantees
    the row exists. Email/name get backfilled by the webhook (Phase 4).
- Non-functional:
  - Minimal latency: one PK upsert per write path, not on reads.

## Architecture

```ts
// src/server/auth/sync-user.ts (add alongside syncUser)
export async function ensureUserProfile(userId: string) {
  await db.userProfile.upsert({
    where: { id: userId },
    update: {},                 // no-op when row exists
    create: { id: userId },     // minimal row; webhook backfills email/name
  });
}
```

**Centralized placement (F1 decision):** all FK-creating writes funnel through ~5 shared
modules, so the guard lives there — one call per module, not per route:

| Module | Create sites needing guard |
|--------|----------------------------|
| `src/server/modules/upload/passage-create/passage-create.service.ts` (`createPassageRecord`) | `passage-queries.ts:83` |
| `src/server/db/vocabulary-queries.ts` | `:44` upsert, `:98` occurrence |
| `src/server/db/translation-queries.ts` | `:80` cache, `:102` history, `:121` vocab upsert, `:157` occurrence |
| `src/server/db/study-session-queries.ts` | `:17`, `:70` (tx) |
| `src/server/db/vocabulary-set-queries.ts` | `:61/:87` upsert, `:111/:183` create |

Each module calls `ensureUserProfile(userId)` once, before its first insert/upsert (inside
the transaction where one is used, so the row exists for the FK):

```ts
export async function createPassageRecord({ userId, ... }) {
  await ensureUserProfile(userId);   // guarantees FK target before insert
  return db.passage.create({ data: { userId, ... } });
}
```

This keeps the 28 route handlers unchanged (they already pass `userId` to these modules) and
removes the risk of a future write route forgetting the guard.

## Related Code Files

- Modify: `src/server/auth/sync-user.ts` (add `ensureUserProfile`)
- Add: `src/server/auth/sync-user.test.ts` (or extend existing) — TDD for idempotency
- Modify (shared create modules — add one `ensureUserProfile(userId)` call each):
  ```
  src/server/modules/upload/passage-create/passage-create.service.ts
  src/server/db/vocabulary-queries.ts
  src/server/db/translation-queries.ts
  src/server/db/study-session-queries.ts
  src/server/db/vocabulary-set-queries.ts
  ```
  Route handlers are NOT modified in this phase — they already delegate to these modules.
  Verify no FK-creating write bypasses these modules with an inline `db.*.create` in a route
  (grep guard in step 3).

## Implementation Steps

1. **TDD** in `sync-user.test.ts`:
   - `ensureUserProfile` calls `upsert` with `create: { id }`, `update: {}`.
   - Idempotent: calling twice does not throw / no duplicate create semantics.
   - Does NOT call `clerkClient`.
2. Implement `ensureUserProfile`.
3. Grep guard: confirm every `db.*.create`/`upsert` of a `userId`-FK row lives in the 5
   shared modules above (no inline create in a route handler). If one exists, either route
   it through a module or add the guard there.
4. Add one `ensureUserProfile(userId)` call to each shared module, before its first insert
   (inside the transaction when one is used so the FK target exists).
5. Add/extend a test simulating "no profile row yet → create via module succeeds" for at
   least one module (e.g. `study-session-queries`).
6. Run module + write-route tests + `pnpm run typecheck`.

## Success Criteria

- [ ] `ensureUserProfile` tested first, idempotent, no Clerk fetch
- [ ] All 5 shared create modules call `ensureUserProfile` before their first FK insert
- [ ] Grep guard confirms no route inserts a `userId`-FK row outside these modules
- [ ] New-user first-write no longer risks an FK violation (covered by a test)
- [ ] `pnpm run typecheck` clean

## Risk Assessment

- Risk: a future write bypasses the 5 modules with an inline route `db.create`. Mitigation:
  grep guard in step 3 + module-level placement is the convention; document it in
  `prisma/SECURITY.md` (Phase 5).
- Risk: extra upsert latency on writes. Mitigation: single indexed PK upsert; negligible vs
  the removed per-read Clerk call.
- Note (links Phase 4): `ensureUserProfile` upserts unconditionally, so a late authenticated
  write arriving after `user.deleted` can resurrect the profile (zombie). Accepted as a known
  limitation — see Phase 4 Risk Assessment.
