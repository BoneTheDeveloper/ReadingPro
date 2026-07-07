---
phase: 4
title: "Broaden toHttp to remaining routes"
status: completed
priority: P3
effort: "1h"
dependencies: [3]
---

# Phase 4: Broaden toHttp to remaining routes

## Overview

Optional polish. Migrate the remaining ~8 routes that only do auth/zod classification (no ownership,
so no string-match bug) to `toHttp` for uniform 401/400/500 handling + Sentry. Deferrable — skipping
this leaves the codebase fully working; it only removes remaining per-route boilerplate.

## Requirements

- Functional: identical status codes for every migrated route; uniform 500 Sentry + logging (intentional per plan).
- Non-functional: no route hand-rolls `isAuthenticationRequiredError`/`getZodErrorMessage` branches that `toHttp` already covers.

## Related Code Files

Migrate (auth/zod-only routes, grep-verified — the 15 total minus the 7 done in Phase 3):

- Modify: `src/app/api/vocabulary/route.ts` (if not already folded in Phase 3)
- Modify: `src/app/api/vocabulary/list/route.ts`
- Modify: `src/app/api/vocabulary/stats/route.ts`
- Modify: `src/app/api/vocabulary/sets/route.ts`
- Modify: `src/app/api/learning-session/route.ts`
- Modify: `src/app/api/progress/stats/route.ts`
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/upload/text/route.ts`

## Implementation Steps

1. Per route: replace the hand-rolled 401/400/500 catch blocks with `return toHttp(error, requestLog, "<route-id>")`, preserving the existing route-id string.
2. Watch for routes with domain-specific typed errors beyond auth/zod (e.g. `PassageStudyServiceError`, upload-specific errors) — those need either an explicit branch in `toHttp` or to stay as a pre-`toHttp` check in the route. Do NOT collapse a route whose specific error would silently fall to the 500 branch and change its status.
3. `pnpm run typecheck && pnpm run lint`.
4. Manual walk: unauthenticated request → 401; bad payload → 400; forced failure → 500 + Sentry.

## Success Criteria

- [x] Listed routes route their catch through `toHttp` (or documented why a route keeps a bespoke branch)
- [x] No status-code regression — manual walk done
- [x] `pnpm run typecheck && pnpm run lint` pass

## Risk Assessment

Low-medium. The trap is a route with a domain error that isn't auth/zod/NotFound — folding it into
`toHttp` blindly turns its intended 4xx into a 500. Step 2 guards this: inventory each route's catch
for non-generic error types before collapsing. Because this phase is optional, it can be dropped or
split per-route if any route needs a `toHttp` branch extension that feels like scope creep.
