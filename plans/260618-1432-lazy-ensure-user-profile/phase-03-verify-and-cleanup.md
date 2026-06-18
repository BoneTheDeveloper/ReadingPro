---
phase: 3
title: "Verify and cleanup"
status: pending
priority: P2
effort: "1h"
dependencies: [2]
---

# Phase 3: Verify and cleanup

## Overview

Prove the refactor removes the steady-state cost without changing existing-user behavior,
clean up the dead mock, and update the docs that describe the ensure-on-write fallback.

## Requirements

- Functional: full suite green; no pre-emptive `ensureUserProfile` in any prod write path.
- Non-functional: docs reflect the optimistic FK-catch (lazy ensure) model.

## Architecture

Verification matrix:

| Concern | Check |
|---------|-------|
| No pre-emptive ensure | `rg "ensureUserProfile" src -g '!*.test.ts'` → only inside `withUserProfile` |
| Steady-state zero-cost | happy-path tests assert no profile upsert on existing-user writes |
| Race self-heals | helper + a migrated-module test cover FK → ensure → retry |
| Non-userId FK propagates | test asserts `*_sourceId_fkey` P2003 throws through |
| Build | `pnpm run typecheck` + `pnpm run lint` + `pnpm run test` |

## Related Code Files

- Modify: `src/app/api/webhooks/clerk/route.test.ts` — remove the dead `ensureUserProfile`
  mock (lines ~15, ~21); `route.ts` never imports it.
- Modify: `docs/Architecture/auth-architecture.md` — update the "ensure-on-write fallback"
  paragraph: it is now *lazy* (only on a `UserProfile` FK miss), not pre-emptive per write.
- Modify: `docs/Flows/auth-flow.md` — update the first-write fallback block to the
  optimistic FK-catch flow.
- Modify: `prisma/SECURITY.md` — rule 4 (FK-creating writes go through shared modules):
  clarify the modules now wrap writes in `withUserProfile` (lazy ensure) rather than calling
  `ensureUserProfile` up front; the "no inline `db.*.create` of a `userId`-FK row in route
  handlers" convention is unchanged.

## Implementation Steps

1. `pnpm run typecheck && pnpm run lint && pnpm run test` — all green.
2. Run the verification matrix greps/tests.
3. Remove the dead mock in `route.test.ts`.
4. Update the 3 docs to describe lazy ensure; confirm no stale "ensure before every write"
   wording remains.

## Success Criteria

- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` all pass
- [ ] No pre-emptive `ensureUserProfile` in any prod write path (rg guard)
- [ ] Dead `ensureUserProfile` mock removed from `route.test.ts`
- [ ] auth-architecture, auth-flow, SECURITY docs describe the lazy FK-catch model

## Risk Assessment

- Risk: docs drift (still say "ensure before every write"). Mitigation: this phase is the
  doc gate; update before marking done.
- Risk: a test still asserts old pre-emptive behavior and passes for the wrong reason.
  Mitigation: Phase 2 converts happy-path assertions to "not called"; re-confirm here.
