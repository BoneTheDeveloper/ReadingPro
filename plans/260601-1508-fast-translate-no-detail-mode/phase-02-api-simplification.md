---
phase: 2
title: "API Simplification"
status: pending
priority: P1
effort: "5h"
dependencies: [1]
---

# Phase 2: API Simplification

## Overview

Remove translate modes from `/api/translate`. The route should expose one fast response shape and no detailed AI branch.

## Requirements

- Functional: Request schema has no `mode`.
- Functional: Response data is always `{ translation, type, provider }`.
- Functional: Cache keys no longer split quick vs detailed entries.
- Functional: Existing ownership checks and cache-first behavior remain.
- Functional: Cache persistence is best-effort async; current translation response must not wait for cache write.
- Non-functional: No AI provider import or AI span remains in translate route.

## Architecture

The route flow becomes:

1. Parse and validate request.
2. Authenticate user.
3. Build fast translation cache key.
4. Return cache hit if valid.
5. Verify source ownership on cache miss.
6. Resolve dictionary or non-AI machine translation.
7. Return the resolved translation response.
8. Persist cache and history asynchronously with error logging.

## Related Code Files

- Modify: `src/app/api/translate/route.ts`
- Modify: `src/lib/db/translation-queries.ts`
- Modify: `src/lib/ai/translator.ts`
- Verify: Prisma models do not need migration unless detailed cache data cleanup is required.

## Implementation Steps

1. Remove `mode` from `translateRequestSchema`.
2. Delete detailed translation branching in `/api/translate`.
3. Remove `generateDetailedAiTranslation` and detailed schema imports from the route.
4. Update `buildTranslationCacheKey()` inputs so mode is not part of future fast cache entries.
5. Decide whether old cache rows with `mode = detailed` are ignored or cleaned later.
6. Move cache write out of the response-blocking path.
7. Keep history creation fire-and-forget with the fast response only.
8. Log async cache/history failures without changing the already-returned translation response.

## Success Criteria

- [ ] `/api/translate` rejects no valid fast request for missing `mode`.
- [ ] `/api/translate` no longer accepts or uses `mode: "detailed"`.
- [ ] No detailed AI call is reachable from translate route.
- [ ] Cache hit, dictionary hit, fallback, and machine translation still work.
- [ ] Cache miss response does not wait for `cacheWrite`.
- [ ] Unauthorized source access still returns `404` on cache miss.

## Risk Assessment

Risk: Removing `mode` from cache keys can collide with existing rows if old data remains.
Mitigation: Either include a new fast-only cache version field in the hash, or keep legacy `mode` column populated internally as `"fast"` until a migration cleans it up.

Risk: Async cache write failures make later identical requests recompute translation.
Mitigation: Log failures to Sentry and treat cache as performance optimization, not correctness dependency.
