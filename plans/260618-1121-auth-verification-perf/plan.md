---
title: Auth verification performance refactor (getUserId + Clerk webhook)
description: ''
status: completed
priority: P2
branch: feature/issue-69-study-quiz-flow
tags: []
blockedBy: []
blocks: []
created: '2026-06-18T04:21:58.965Z'
createdBy: 'ck:plan'
source: skill
---

# Auth verification performance refactor (getUserId + Clerk webhook)

## Overview

Remove a per-request Clerk Backend API call + DB upsert from the auth gate.
`getCurrentUser()` runs on every authenticated request (28 API routes) and does a
rate-limited `clerkClient().users.getUser()` plus a `UserProfile` upsert — to populate
fields the app never reads (only `user.id` is used: 54 refs, zero email/name/avatar refs).

Fix: a JWT-only `getUserId()` for the hot path; keep `UserProfile` fresh via a Clerk
webhook; guarantee the row exists at first write with an idempotent `ensureUserProfile()`
fallback (webhooks are eventually consistent). Per-query `userId` authorization is
unchanged. TDD: lock current auth/authz behavior before refactoring.

Source brainstorm: `plans/reports/brainstorm-260618-1120-auth-verification-perf.md`

**Locked decisions (do not re-litigate):** getUserId from `auth()` JWT only · migrate all
28 routes in one pass · webhook subscribes user.created/updated/deleted via `verifyWebhook()` ·
ensure-on-write fallback centralized in the 5 shared create modules · `user.deleted` = hard
delete (FK `onDelete: Cascade` already in schema). Two JWT-only gates by surface:
`getUserId()` (API routes → throw → 401) and `getPageUserId()` = `auth.protect()` (Server
Components → redirect to sign-in; authoritative, not trusting middleware — cf.
CVE-2025-29927). `getCurrentUser()` retained only where the full profile is needed.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Fast-path getUserId (TDD)](./phase-01-fast-path-getuserid-tdd.md) | Completed |
| 2 | [Migrate routes to getUserId](./phase-02-migrate-routes-to-getuserid.md) | Completed |
| 3 | [Ensure-on-write fallback (TDD)](./phase-03-ensure-on-write-fallback-tdd.md) | Completed |
| 4 | [Clerk webhook sync](./phase-04-clerk-webhook-sync.md) | Completed |
| 5 | [Verification and docs](./phase-05-verification-and-docs.md) | Completed |

## Dependencies

No cross-plan dependencies. Phases are sequential (1→2→3→4→5).

## Red Team Review

3 hostile lenses (Security Adversary, Assumption Destroyer, Failure Mode Analyst), run
inline with codebase verification. 5 findings, all evidence-cited; 4 accepted, 1 note-only.

| # | Sev | Finding | Disposition |
|---|-----|---------|-------------|
| F1 | High | `ensureUserProfile` scattered across 13 routes → easy to miss on a new route | **Accept** — centralized in 5 shared create modules (Phase 3) |
| F2 | Med | `page.tsx` Server Component relies on `getCurrentUser` null-return; `getUserId` throws | **Accept (refined in impl)** — Server Components use new `getPageUserId()` = `auth.protect()` (redirect UX, JWT-only, authoritative vs middleware); `page.tsx` keeps `getCurrentUser` for its null-return widget (Phase 2) |
| F3 | Med | Late write after `user.deleted` resurrects profile (zombie) | **Accept** — documented as known limitation (Phase 4) |
| F4 | Low | `user.updated` has no delivery ordering; stale retry overwrites newer data | **Reject** — note-only, YAGNI for name/email (Phase 4) |
| F5 | Low | `verifyWebhook` availability was an implicit assumption | **Accept** — verified present; explicit preflight + success criterion (Phase 4) |

No authz regression found: migration only changes the *source* of `userId` (still from
`auth()`, never request body); per-query scoping unchanged. Profile display is already
client-side via Clerk `<UserButton>` (`src/ui/layout/auth-controls.tsx:27`).

### Whole-Plan Consistency Sweep

- Phase 3 fully restructured route-level → module-level placement; route list removed,
  shared-module table added; success criteria + risks updated to match. No stale route-list
  references remain.
- Phase 2 scope narrowed to API route handlers; Server Component guidance updated in
  overview, steps, and success criteria consistently.
- Phase 4 zombie-resurrection note cross-links Phase 3; both phases reference the same
  accepted limitation.
- `plan.md` locked-decisions line updated (ensure-on-write → centralized in shared modules).
- No contradictions remain. Plan is implementation-ready.
