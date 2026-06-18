---
phase: 2
title: Migrate routes to getUserId
status: completed
priority: P1
effort: 3h
dependencies:
  - 1
---

# Phase 2: Migrate routes to getUserId

## Overview

Switch all 28 API routes that call `getAuthenticatedUser()` to `getUserId()`. Every route
only consumes `user.id`, so the heavy Clerk fetch + DB upsert is pure waste on each read.
After this phase the read hot path is a single JWT verify.

## Requirements

- Functional:
  - Each route replaces `const user = await getAuthenticatedUser();` with
    `const userId = await getUserId();` and uses `userId` wherever it used `user.id`.
  - 401 mapping unchanged (`isAuthenticationRequiredError` still catches the thrown error).
  - Per-query `userId` authorization scoping unchanged (still `where: { userId }` /
    ownership checks) — only the source of `userId` changes.
- Non-functional:
  - No route should still import `getAuthenticatedUser` unless it genuinely needs
    email/name (none currently do).

## Architecture

Pattern per route:

```ts
// before
const user = await getAuthenticatedUser();
... where: { userId: user.id } ...

// after
import { getUserId } from "@/server/auth/auth-utils";
const userId = await getUserId();
... where: { userId } ...
```

## Related Code Files (Modify — the 28 routes)

```
src/app/api/dictionary/entries/[entryId]/route.ts
src/app/api/dictionary/lookup/route.ts
src/app/api/dictionary/search/route.ts
src/app/api/dictionary/suggest/route.ts
src/app/api/progress/stats/route.ts
src/app/api/study/passages/[id]/route.ts
src/app/api/study/passages/[id]/simplify/route.ts
src/app/api/study/passages/route.ts
src/app/api/study/sessions/route.ts
src/app/api/study/studio/artifacts/[id]/quiz-result/route.ts
src/app/api/study/studio/artifacts/[id]/route.ts
src/app/api/study/studio/artifacts/route.ts
src/app/api/study/studio/chat/route.ts
src/app/api/study/studio/questions/route.ts
src/app/api/test/dictionary-performance-fixtures/route.ts
src/app/api/test/translate-performance-fixtures/route.ts
src/app/api/translate/route.ts
src/app/api/upload/route.ts
src/app/api/upload/text/route.ts
src/app/api/vocabulary/[id]/review/route.ts
src/app/api/vocabulary/[id]/route.ts
src/app/api/vocabulary/[id]/status/route.ts
src/app/api/vocabulary/list/route.ts
src/app/api/vocabulary/route.ts
src/app/api/vocabulary/sets/[id]/items/[itemId]/route.ts
src/app/api/vocabulary/sets/[id]/items/route.ts
src/app/api/vocabulary/sets/[id]/route.ts
src/app/api/vocabulary/sets/route.ts
```

### Server Component auth gate (decided during implementation)

Server Components must NOT borrow the API-route gate. The semantics differ by surface:

| Surface | Gate | No-session behavior |
|---------|------|--------------------|
| API routes (28) | `getUserId()` — `auth()` JWT, throws | → **401** |
| Server Component pages | `getPageUserId()` — `auth.protect()` JWT | → **redirect to sign-in** |

`getUserId()` *throws* → in a page that surfaces an `error.tsx` boundary, not a sign-in
redirect. A page should redirect. Clerk's `auth.protect()` does exactly that (redirects
document requests, JWT-only, returns `userId`), so `getPageUserId()` wraps it.

**This is an authoritative check, not a duplicate of middleware.** Middleware (`proxy.ts`)
is an *optimistic* redirect only and must not be the sole gate — Next.js middleware has been
bypassable (CVE-2025-29927) and matcher gaps happen. Defense-in-depth / Data-Access-Layer
best practice (Next.js + Clerk) is to verify auth where data is accessed. So the 3 dashboard
Server Components (`study`, `dictionary`, `vocabulary`) use `getPageUserId()`.

Both gates are JWT-only — neither reintroduces the heavy `clerkClient` fetch. `getCurrentUser()`
is retained only for a place that genuinely needs the full profile (e.g. `page.tsx:254`
null-return progress widget). Profile display (name/avatar) is already client-side via Clerk
`<UserButton>` (`src/ui/layout/auth-controls.tsx:27`).

## Implementation Steps

1. Per route: add `getUserId` import, replace the gate call, rename `user.id` → `userId`.
2. Remove now-unused `getAuthenticatedUser` import where dropped.
3. Grep guard: `rg 'getAuthenticatedUser' src/app/api` should return only routes that
   truly still need the full profile (expected: none).
4. Server Components: add `getPageUserId()` (`auth.protect()` wrapper) and point the 3
   dashboard pages at it (redirect-on-no-session). `page.tsx` keeps `getCurrentUser` for its
   null-return progress widget.
5. Run existing route/integration tests; fix any test that asserted the old call.
6. `pnpm run typecheck` + `pnpm run lint`.

## Success Criteria

- [ ] All 28 API routes use `getUserId()`; `user.id` references replaced with `userId`
- [ ] 401 behavior and per-query `userId` scoping unchanged (verified by existing tests)
- [ ] No `getAuthenticatedUser` left in `src/app/api` (unless profile fields needed)
- [ ] `getPageUserId()` (`auth.protect()`) added; 3 dashboard Server Components use it (redirect UX)
- [ ] `page.tsx` retains `getCurrentUser` for its null-return progress widget
- [ ] `pnpm run typecheck` + `pnpm run lint` clean

## Risk Assessment

- Risk: a route that secretly used `user.email`/`user.name` would break. Mitigation: scout
  confirmed zero such uses; per-route audit in step 1 re-confirms.
- Risk: large diff. Mitigation: mechanical, single pattern; existing per-route tests +
  `userId` scoping tests catch regressions.
