---
phase: 1
title: withUserProfile helper + FK matcher (TDD)
status: completed
priority: P2
effort: 2h
dependencies: []
---

# Phase 1: withUserProfile helper + FK matcher (TDD)

## Overview

Add `withUserProfile(userId, write)` and `isMissingUserProfileFk(e)` to
`src/server/auth/sync-user.ts`. Tests first: lock the success path (no ensure), the
new-user race path (FK → ensure → retry), and the propagation path (non-`userId` FK throws
through). `ensureUserProfile` is retained unchanged.

## Requirements

- Functional:
  - `withUserProfile` runs `write()`; returns its result with no extra DB call when it
    succeeds.
  - On a `UserProfile`/`userId` FK violation, calls `ensureUserProfile(userId)` once, then
    retries `write()` exactly once and returns its result.
  - Any other error (including a non-`userId` `P2003`, e.g. a missing `sourceId`/passage FK)
    propagates unchanged — no ensure, no retry.
- Non-functional: matcher must be correct against Prisma 7.8 `P2003` payload; no Clerk call.

## Architecture

```ts
// src/server/auth/sync-user.ts
import { Prisma } from "@prisma/client";

function isMissingUserProfileFk(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError &&
    e.code === "P2003" &&
    referencesUserIdFk(e)            // see verification step
  );
}

export async function withUserProfile<T>(userId: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (e) {
    if (isMissingUserProfileFk(e)) {
      // Self-heal the new-user race (profile not yet synced). Logged because a
      // *persistently* hot heal path signals a broken/lagging Clerk webhook, not a
      // one-off first-write race.
      log.warn({ userId }, "withUserProfile: missing UserProfile FK, ensuring + retrying");
      await ensureUserProfile(userId);
      return await write();          // first attempt inserted nothing → clean retry
    }
    throw e;
  }
}
```

**Verification step — HARD GATE (do NOT trust the matcher until this passes):** the entire
design hinges on `isMissingUserProfileFk` actually matching the real `P2003` payload. If it
silently never matches, the race is *not* healed and every brand-new user gets a 500 on
their first write — worse than the bug we're removing. So:

1. Capture the real Prisma 7.8 `P2003` payload for a `userId` FK violation via an
   integration test that inserts a `userId`-FK row with no profile (or a `psql`-induced
   violation). Do NOT guess the shape.
2. Inspect `meta` — candidates `meta.field_name` (e.g. `"userId"`) and/or `meta.constraint`
   (e.g. `"translation_caches_userId_fkey"`). Implement `referencesUserIdFk` to match
   whichever is populated (constraint name ends in `_userId_fkey` OR `field_name === "userId"`).
3. Add a test that asserts `isMissingUserProfileFk(realCapturedError) === true`. This test
   is the gate — phase 1 is NOT complete until it passes against a real (not hand-mocked)
   payload. A hand-built mock alone is insufficient; it can encode the same wrong assumption.

Retry granularity is the whole `write()` closure. For the one transactional caller
(`ensureActiveSession`), the closure is the entire `db.$transaction(...)` call, so an FK
rollback releases the advisory lock and the retry re-runs the atomic block cleanly
(Phase 2 wires this).

## Related Code Files

- Modify: `src/server/auth/sync-user.ts` — add `withUserProfile` + `isMissingUserProfileFk`;
  keep `ensureUserProfile`, `syncUser`, `deleteUserProfile`. Add a module logger
  (`createModuleLogger("auth:sync-user")`, matching `auth-utils.ts`) for the heal warning.
- Modify: `src/server/auth/sync-user.test.ts` — add tests for the new helper (success path,
  FK-retry path, propagation path); keep existing `ensureUserProfile` tests.

## Implementation Steps

1. (TDD) Write failing tests in `sync-user.test.ts`:
   - success: `write` resolves → returned as-is, `ensureUserProfile`/`upsert` NOT called.
   - race: first `write` rejects with a `userId` `P2003`, second resolves → `ensureUserProfile`
     called once, `write` called twice, result from second.
   - propagation: `write` rejects with a non-`userId` `P2003` (constraint
     `*_sourceId_fkey`) → error propagates, `ensureUserProfile` NOT called, `write` called once.
   - propagation: `write` rejects with a non-Prisma error → propagates, no ensure.
2. Verify the real Prisma 7.8 `P2003` `meta` shape via integration test/psql (HARD GATE
   above) and implement `referencesUserIdFk` accordingly. Add the
   `isMissingUserProfileFk(realCapturedError) === true` assertion test.
3. Implement `withUserProfile` + `isMissingUserProfileFk`, including the `log.warn` in the
   heal branch (assert it fires on the retry path, not the happy path).
4. `pnpm run typecheck && pnpm run lint && pnpm run test src/server/auth` green.

## Success Criteria

- [x] Tests cover success / race-retry / non-userId-FK propagation / non-Prisma propagation
- [x] `withUserProfile` adds zero DB calls when `write` succeeds (asserted)
- [x] **HARD GATE:** `isMissingUserProfileFk(realCapturedError) === true` against a real
      (integration-captured, not hand-mocked) Prisma 7.8 `P2003` `userId`-FK payload
- [x] Heal branch emits `log.warn` on the retry path only (asserted not to fire on happy path)
- [x] `ensureUserProfile` unchanged; no Clerk call introduced
- [x] `pnpm run typecheck`, `lint`, auth tests pass

## Risk Assessment

- Risk: matcher guesses wrong `meta` field and silently never matches (race never heals) OR
  matches too broadly (masks real `sourceId` bugs). Mitigation: verify real payload in
  step 2; explicit propagation test for `*_sourceId_fkey`.
- Risk: Prisma import path / type. Mitigation: `Prisma.PrismaClientKnownRequestError` from
  `@prisma/client`, already used elsewhere in the codebase if present — check before adding.
