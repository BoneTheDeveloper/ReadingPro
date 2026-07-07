---
phase: 3
title: "Migrate ownership routes and delete string matchers"
status: pending
priority: P2
effort: "1.5h"
dependencies: [2]
---

# Phase 3: Migrate ownership routes and delete string matchers

## Overview

Migrate the 7 ownership routes to route their catch through `toHttp` (which classifies by
`instanceof NotFoundError`), then delete `isOwnershipMissError` + `isOwnershipMissMessage` entirely.
After this phase no route classifies errors by message string.

## Requirements

- Functional: each migrated route returns the SAME status codes as before (401/404/400/500) for the same inputs; 404 now via `instanceof NotFoundError` not string-match.
- Non-functional: `isOwnershipMissError` + `isOwnershipMissMessage` deleted; zero importers remain.

## Architecture

Each route's `catch` collapses to a single `toHttp` call. Note: `toHttp` returns a generic 404
body `"<resource> not found."` (from `NotFoundError`). Where a route currently returns a specific
custom 404 string (e.g. `"Vocabulary item not found."`), confirm the `NotFoundError` resource label
chosen in Phase 2 produces an acceptable message, or pass the desired label there. This is the one
place a user-facing string can drift — check each.

```ts
} catch (error) {
  return toHttp(error, requestLog, "api:vocabulary-item-delete");
}
```

## Related Code Files

Migrate (the 7 routes using `isOwnershipMissError`, grep-verified):

- Modify: `src/app/api/vocabulary/[id]/route.ts`
- Modify: `src/app/api/vocabulary/[id]/review/route.ts`
- Modify: `src/app/api/vocabulary/[id]/status/route.ts`
- Modify: `src/app/api/vocabulary/sets/[id]/route.ts` (two catch sites)
- Modify: `src/app/api/vocabulary/sets/[id]/items/route.ts`
- Modify: `src/app/api/vocabulary/sets/[id]/items/[itemId]/route.ts`
- Modify: `src/app/api/studio/questions/route.ts` (maps `ArtifactNotFoundError`/passage not-found → 404; ensure `toHttp` catches it — `ArtifactNotFoundError` is NOT `NotFoundError`, so either (a) also check `instanceof ArtifactNotFoundError` in `toHttp`, or (b) have the passage/artifact path raise `NotFoundError`. Decide during impl; prefer making `toHttp` recognize both, or unify artifact error to extend `NotFoundError`.)
- Modify: `src/app/api/vocabulary/route.ts` — POST currently uses `instanceof VocabularyServiceError` → 404; fold into `toHttp` too, OR leave (it is already typed, not string-match). Keep behavior identical.

Delete:
- `isOwnershipMissError` + `isOwnershipMissMessage` from `src/lib/http/route-errors.ts` (~25 lines).

## Implementation Steps

1. Decide the `ArtifactNotFoundError` question: simplest is to make `ArtifactNotFoundError extends NotFoundError` (Phase 2 file) so `toHttp`'s single `instanceof NotFoundError` catches it. If chosen, adjust Phase 2's class. Otherwise add an explicit `instanceof ArtifactNotFoundError` branch to `toHttp`.
2. For each of the 7 routes: replace the `if (isOwnershipMissError(...))` block (and the surrounding hand-rolled 401/500 blocks) with a single `return toHttp(error, requestLog, "<route-id>")`. Preserve the existing route-id string used in current Sentry tags where present.
3. For any route whose 404 body text must stay exact, verify the `NotFoundError` message matches or adjust the resource label.
4. Grep `isOwnershipMissError` across `src/` → must be 0 before deleting the functions.
5. Delete `isOwnershipMissError` + `isOwnershipMissMessage`.
6. `pnpm run typecheck && pnpm run lint`.
7. **Manual walk** each of the 7 routes' not-found path (wrong id / other user's resource) → confirm 404 with acceptable body; confirm a forced 500 still Sentry-captures.

## Success Criteria

- [ ] All 7 ownership routes route their catch through `toHttp`
- [ ] `ArtifactNotFoundError` handled (via extends `NotFoundError` or explicit branch in `toHttp`)
- [ ] `isOwnershipMissError` + `isOwnershipMissMessage` deleted; grep shows 0 references
- [ ] Status codes unchanged per route (401/404/400/500) — manual walk done
- [ ] `pnpm run typecheck && pnpm run lint` pass

## Risk Assessment

Medium-high — this is the behavior-visible phase. Main risks: (1) a 404 user-facing message string
drifts because `NotFoundError` message differs from the old hardcoded route text — mitigate by
checking each route's body in step 3; (2) `ArtifactNotFoundError` slips through `toHttp` and becomes
a 500 — mitigate via step 1 decision + manual walk of `studio/questions`. Do NOT delete the matchers
until step 4 grep confirms zero references.
