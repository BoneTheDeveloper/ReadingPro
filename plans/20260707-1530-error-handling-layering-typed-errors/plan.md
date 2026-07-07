---
title: "Error Handling Layering: Typed Errors + toHttp"
description: "Replace fragile string-match error classification with typed domain errors raised at repo/service and a single toHttp() boundary that maps them to HTTP. Pure refactor, no new endpoints."
status: completed
priority: P2
branch: "preview"
tags: [refactor, error-handling, api]
blockedBy: []
blocks: []
created: "2026-07-07T09:00:54.542Z"
createdBy: "ck:plan"
source: skill
---

# Error Handling Layering: Typed Errors + toHttp

## Overview

From brainstorm report
[plans/reports/20260707-error-handling-layering-typed-errors-tohttp.md](../reports/20260707-error-handling-layering-typed-errors-tohttp.md).

Fix `src/lib/http/route-errors.ts`: today `isOwnershipMissError` classifies "not found / not owned"
by **fuzzy string matching** on error messages — fragile (reword a repo message or bump Prisma →
silent 500 instead of 404) and inconsistent (same feature reaches 404 two different ways). Replace
with the agreed 4-layer model:

```
Prisma/raw → [repo/service: raise NotFoundError] → route (thin try/catch) → [toHttp(): map to HTTP, one place]
                  WHERE the meaning is known                                    reuses existing classifiers
```

- **Repo/service** convert raw errors (Prisma) into domain error `NotFoundError`. Nothing above imports Prisma error types.
- **Boundary** `toHttp(e, log, route)` in `route-errors.ts` maps domain error → HTTP status + body, reusing `isAuthenticationRequiredError` / `getZodErrorMessage`.
- **Route** stays thin: `try { ... } catch (e) { return toHttp(e, requestLog, "api:x") }`.

## Locked decisions

- **Prisma P2025 → option (B):** replace `findUniqueOrThrow` with `findUnique` + null-check, merging
  "missing" + "not owned" into one `NotFoundError`. No `error.code` matching needed. Security-correct
  (non-owner cannot distinguish missing vs forbidden).
- **Uniformization accepted (intentional):** every 500 now goes through `toHttp` → uniform
  `Sentry.captureException` + logging. Some routes differ today (DELETE vocabulary does not Sentry
  its 500; POST does). This is desired, not a regression.
- **No `withErrorHandler` wrapper this round** (YAGNI) — start with `toHttp(e, log, route)`.
- **No `--tdd`:** repo has no test runner (no vitest/jest, no `*.test.ts`). Per-phase verification =
  `pnpm run typecheck && pnpm run lint` + manual walk of each migrated route's not-found path (same
  approach as the two prior completed plans).
- **Logger type:** `toHttp` takes `ReturnType<typeof createRequestLogger>` (no named Logger export exists).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [NotFoundError class and toHttp boundary](./phase-01-notfounderror-class-and-tohttp-boundary.md) | Completed |
| 2 | [Repo and service raise typed errors](./phase-02-repo-and-service-raise-typed-errors.md) | Completed |
| 3 | [Migrate ownership routes and delete string matchers](./phase-03-migrate-ownership-routes-and-delete-string-matchers.md) | Completed |
| 4 | [Broaden toHttp to remaining routes](./phase-04-broaden-tohttp-to-remaining-routes.md) | Completed |

## Dependencies

Strictly sequential. P1 creates `NotFoundError` + `toHttp` (nothing else can reference them first).
P2 makes repo/service raise `NotFoundError` (needs the class from P1). P3 migrates the 7 ownership
routes to `instanceof NotFoundError` via `toHttp` and deletes the string matchers (needs P2 done, or
routes would 500 on not-found in the gap). P4 is optional polish — migrate the remaining ~8
auth/zod-only routes to `toHttp` for uniformity; can be deferred without leaving the codebase broken.

No blocking relationship with `plans/20260706-1751-src-feature-colocation-restructure/` (its
remaining work is deleting `contracts/`/`server/` dirs — unrelated to error handling).
