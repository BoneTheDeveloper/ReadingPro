---
phase: 5
title: "Verification and docs"
status: pending
priority: P2
effort: "2h"
dependencies: [4]
---

# Phase 5: Verification and docs

## Overview

Prove the refactor preserves auth/authz behavior, removes the per-request Clerk call, and
update the docs that describe the auth flow.

## Requirements

- Functional: full suite green; no route still does a per-request Clerk Backend API call for
  the gate; webhook + ensure-on-write covered.
- Non-functional: docs reflect the new gate (`getUserId`), webhook sync, and the
  ensure-on-write fallback.

## Architecture

Verification matrix:

| Concern | Check |
|---------|-------|
| Auth gate behavior | `pnpm run test src/server/auth` green; 401 on no session |
| Per-query authz unchanged | query-module + route tests green (`userId` scoping intact) |
| No per-request Clerk call | `rg 'clerkClient|getCurrentUser|currentUser' src/app/api` → none in gate path |
| New-user write safe | integration test: no profile → write via shared module → `ensureUserProfile` creates row |
| No bypass | `rg '\.create\(|\.upsert\(' src/app/api` → no inline `userId`-FK insert in route handlers |
| Webhook | `route.test.ts` green (sig, created/updated/deleted, unknown) |
| Build | `pnpm run typecheck` + `pnpm run lint` + `pnpm run test` |

## Related Code Files

- Modify: `docs/Architecture/auth-architecture.md` — document `getUserId` (JWT-only gate)
  vs `getCurrentUser` (profile fetch), webhook sync, ensure-on-write fallback.
- Modify: `docs/Flows/auth-flow.md` — update request → verify → query flow.
- Modify: `prisma/SECURITY.md` — rule "Never skip `getAuthenticatedUser()`" → update to
  `getUserId()` as the gate; clarify identity still comes from auth, never request body; add
  the convention that FK-creating writes go through the 5 shared create modules which call
  `ensureUserProfile` (no inline `db.*.create` of a `userId`-FK row in route handlers).
- Modify: `docs/Operations/` — add Clerk webhook setup + `CLERK_WEBHOOK_SIGNING_SECRET`.
- Modify: `docs/API/` route inventory — add `POST /api/webhooks/clerk` (public).

## Implementation Steps

1. `pnpm run typecheck && pnpm run lint && pnpm run test` — all green.
2. Run the verification matrix greps/tests above.
3. Update the 5 docs to match the new gate, webhook, and fallback.
4. Confirm no stale references to the old per-request sync remain in docs.

## Success Criteria

- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` all pass
- [ ] No per-request `clerkClient`/`currentUser` in any API route gate path
- [ ] Auth docs (auth-architecture, auth-flow, SECURITY, Operations, API inventory) updated
- [ ] New-user-first-write path covered by a test
- [ ] Webhook events covered by tests

## Risk Assessment

- Risk: docs drift. Mitigation: this phase is the doc gate; update before marking done.
- Risk: a missed route still calls the heavy path. Mitigation: the `rg` guard in the matrix
  is the explicit check.
