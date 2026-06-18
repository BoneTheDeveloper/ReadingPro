---
title: "Lazy ensureUserProfile via optimistic FK-catch"
description: ""
status: pending
priority: P2
branch: "feature/issue-69-study-quiz-flow"
tags: []
blockedBy: []
blocks: []
created: "2026-06-18T11:29:23.721Z"
createdBy: "ck:plan"
source: skill
---

# Lazy ensureUserProfile via optimistic FK-catch

## Overview

`ensureUserProfile(userId)` currently runs an extra `upsert` before *every* FK-creating
write (~10 prod call sites), permanently taxing hot paths (translation cache/history) to
cover a race that lasts only minutes for brand-new users. Replace the pre-emptive upsert
with an optimistic pattern: run the write; only on a `UserProfile`-FK violation (Prisma
`P2003` on the `userId` relation) create the profile and retry once. Steady-state cost
drops to **zero** extra round-trips; the cost is paid only during the new-user race window.

Webhook (`/api/webhooks/clerk`) stays unchanged as the primary sync mechanism. TDD: lock
current write behavior + new FK-catch/retry/propagation cases before refactoring call sites.

Source brainstorm: `plans/reports/brainstorm-260618-1430-ensure-user-profile-cost-cut.md`

**Locked decisions (do not re-litigate):** optimistic FK-catch via one `withUserProfile`
wrapper · matcher keys on the `userId` FK only (other FK errors, e.g. missing `sourceId`,
must propagate) · `ensureUserProfile` retained, invoked only inside the wrapper · webhook +
`deleteUserProfile` unchanged · the transactional write `ensureActiveSession` is wrapped
*around* its `$transaction` so an FK rollback retries the whole atomic block.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [withUserProfile helper + FK matcher (TDD)](./phase-01-withuserprofile-helper-fk-matcher-tdd.md) | Pending |
| 2 | [Migrate write call sites to wrapper](./phase-02-migrate-write-call-sites-to-wrapper.md) | Pending |
| 3 | [Verify and cleanup](./phase-03-verify-and-cleanup.md) | Pending |

## Dependencies

No cross-plan dependencies. Follows the completed `260618-1121-auth-verification-perf`
plan (introduced `ensureUserProfile` + webhook). Phases are sequential (1→2→3).

## Red Team Review

Three hostile lenses (Security Adversary, Assumption Destroyer, Failure Mode Analyst), run
inline with codebase verification. Focus: does the change introduce/exploit a vulnerability.
**Verdict: no new vulnerability.** 7 findings; 2 accepted (1 High availability, 1 Med
observability), 5 rejected with evidence.

| # | Sev | Finding | Disposition |
|---|-----|---------|-------------|
| SA1 | — | IDOR: forge `userId` to create/resurrect another user's profile | **Reject** — `userId` from `getUserId()` (auth), spread last over body: `translate/route.ts:98`, `vocabulary/route.ts:62`, `sessions/route.ts:31`, `passages/route.ts:13`. Caller can only ensure own id. |
| SA2 | — | FK-catch bypasses ownership / cross-user injection | **Reject** — FK = existence not ownership; ownership is separate `where:{userId}`. Matcher scoped to `userId` FK; `sourceId` FK propagates. |
| AD1 | High | If `isMissingUserProfileFk` never matches the real `P2003`, race is unhealed → every new user 500s on first write | **Accept** — Phase 1 verification turned into a HARD GATE: assert matcher against a real integration-captured payload before phase completes. |
| AD2 | — | Non-atomic retry double-executes partial writes | **Reject** — all wrapped sites single-statement or `$transaction`: `vocabulary-set-queries.ts:64,92,118`, `translation-queries.ts:83,107`, `study-session-queries.ts:20,46`. |
| FM4 | Med | Silent self-heal masks a broken/lagging webhook (every new user hits heal path, no signal) | **Accept** — `log.warn` in heal branch (Phase 1). |
| SA3 | Low | Zombie resurrection: late write after `user.deleted` recreates minimal profile | **Reject (note)** — identical to current pre-emptive behavior; not introduced/worsened. Pre-existing accepted limitation. |
| FM1-3 | — | Lost original error / concurrent double-ensure / infinite retry | **Reject** — both 500; `upsert` idempotent; retry hardcoded to 1. |

### Whole-Plan Consistency Sweep

- Phase 1 hardened: P2003 verification is now a hard gate (success criteria + steps + risk),
  heal-branch `log.warn` added with logger import note. No contradictions with Phase 2/3.
- Phase 2 retry-safety claim ("clean retry") is now backed by AD2's per-site atomicity
  evidence; no change needed — sites already single-statement/tx.
- Phase 3 unchanged; verification matrix still valid. No stale terms across plan files.
- No unresolved contradictions. Plan is implementation-ready.
