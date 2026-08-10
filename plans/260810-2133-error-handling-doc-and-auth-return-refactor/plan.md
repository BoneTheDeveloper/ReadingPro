---
title: "Error Handling Doc And Auth Return Refactor"
description: "Convert requireApiSession to a discriminated union so auth failure is compile-enforced, then rewrite the stale CLAUDE.md Error Handling section to match verified code."
status: pending
priority: P2
effort: "2-3h"
tags: [error-handling, auth, docs, refactor]
created: 2026-08-10
---

# Error Handling Doc And Auth Return Refactor

## Overview

Two linked problems, one root cause: **CLAUDE.md's Error Handling section
describes an older version of the code**, and the one place where the report's
recommendation genuinely improves on current behavior — auth pre-checks — is
still throw-based.

Source: [research report](../reports/research-260810-2130-api-error-handling-patterns.md),
verified against Next.js 16 docs via ctx7.

### What is already correct (do not change)

The report's headline goal — *expected 4xx must not pollute Sentry* — **is
already met**. [`with-error-handling.ts:37-45`](../../src/lib/error/with-error-handling.ts)
branches on `AppError.isExpected` (`statusCode < 500`):

- 4xx → `log.info`, returns `error.toResponse()`, **no Sentry**
- 5xx → `log.error` + `Sentry.captureException` + sanitized `internalErrorBody()`

So this plan is **not a bug fix**. It is a type-safety and accuracy change.
Anyone executing it should not expect observable runtime behavior to change.

### What is actually wrong

| # | Problem | Evidence |
|---|---------|----------|
| 1 | Auth failure is invisible to the type system | `requireApiSession()` throws; TS types it as always returning `Session`. Forgetting the wrapper compiles fine, fails at runtime |
| 2 | CLAUDE.md omits `isExpected` / Sentry split | Doc says only "withErrorHandling — single logging point" |
| 3 | CLAUDE.md omits `ZodError` → 400 mapping | Implemented at `with-error-handling.ts:29-35`, undocumented |
| 4 | CLAUDE.md omits `unstable_rethrow`, requestId, child logger | All implemented, all undocumented |
| 5 | CLAUDE.md never states the error envelope shape | `{ error: { code, message, details? } }` is the contract both sides depend on |

### Why `return` for auth (ctx7-verified)

The Next.js authentication guide uses exactly this shape in a Route Handler:

```ts
const session = await verifySession()
if (!session) return new Response(null, { status: 401 })
```

Reinforcing evidence from Next.js source (`build/templates/app-route.ts`): an
error that escapes a route handler is converted to a **bare
`Response(null, { status: 500 })`** — no body, bypasses `error.tsx`. A thrown
`AppError(401)` is therefore only correct because `withErrorHandling` catches
it. Coverage is currently **12/12 route files**, so there is no live bug — but
`return` removes the dependency entirely and makes the guard compile-enforced.

Rejected: `unauthorized()` from `next/navigation` — it renders
`unauthorized.tsx` UI, which is wrong for a JSON API consumed by `fetchJson`.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Auth failure becomes a compile error if unhandled, not a runtime surprise | P2 |
| 2 | CLAUDE.md Error Handling section matches verified code, line by line | P1 |
| 3 | Zero change to HTTP responses, status codes, log levels, or Sentry volume | P1 |

## Non-Goals

Explicitly out of scope — these were considered and **rejected with reasons**:

| Not doing | Why |
|-----------|-----|
| `.parse()` → `.safeParse()` across 17 sites | `ZodError` → 400 mapping is already centralized and correct. Churn buys zero behavior change |
| Changing `throw AppError` in services | Services do not know HTTP and cannot return a `Response`. The report agrees |
| Changing `requirePageSession()` | `redirect()` is the correct page-level primitive. API-only change |
| Removing the layout + page double `requirePageSession()` | Intentional. Next.js docs warn layouts are not a reliable auth boundary; `getSession` is `cache()`-wrapped so it costs one lookup |
| Fixing `src/proxy.ts` matcher | **Real bug, separate concern.** See Known Issues |

## Known Issues (report only, do not fix here)

**`src/proxy.ts:16` matcher never fires.** The matcher is `["/dashboard"]`, but
`(dashboard)` is a route group — it does not appear in the URL. Real paths are
`/account`, `/vocabulary`, `/study`. The proxy guard runs on no dashboard page.

Not a live vulnerability: layout and every page call `requirePageSession()`
independently. But the file is currently dead code. Track separately.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Auth Return Refactor](./phase-01-auth-return-refactor.md) | Pending |
| 2 | [Phase 2: Rewrite CLAUDE.md Error Handling](./phase-02-rewrite-claudemd-error-handling.md) | Pending |

Phase 2 depends on Phase 1 — the doc must describe verified code, not intent.

## Success Criteria

- [ ] `requireApiSession()` returns a discriminated union; no `throw` remains in it
- [ ] All 18 call sites across 11 route files narrow via `if (!auth.ok) return auth.response;`
- [ ] Removing a guard line produces a **TypeScript compile error** (spot-check one route)
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm knip` all pass
- [ ] Manual check: unauthenticated `GET /api/vocabulary` still returns `401` with body `{"error":{"code":"UNAUTHORIZED","message":"Authentication required"}}`
- [ ] CLAUDE.md documents `isExpected`, Sentry split, `ZodError` mapping, `unstable_rethrow`, requestId, and envelope shape
- [ ] Every claim in the rewritten CLAUDE.md section traced to a specific source line

<!-- slug: error-handling-doc-and-auth-return-refactor -->
