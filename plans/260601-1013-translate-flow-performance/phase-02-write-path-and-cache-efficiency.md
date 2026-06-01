---
phase: 2
title: "Write Path and Cache Efficiency"
status: pending
priority: P1
effort: "5h"
dependencies: [1]
---

# Phase 2: Write Path and Cache Efficiency

## Overview

Cut the remaining queries on the single-word dictionary hit path to reach ≤4 blocking. After Phase 1 collapses `dictionaryResolve` from 3→1-2, the remaining cuts are: combine `sourceFetch`+`cacheRead` into 1 read, and make `historyCreate` non-blocking.

| Step | Before Phase 1 | After Phase 1 | After this phase | Total cut |
|------|----------------|---------------|------------------|-----------|
| `sourceFetch` + `cacheRead` | 2q | 2q | merged → 1q | −1 |
| `dictionaryResolve` | 3q | 1-2q | 1-2q (unchanged) | — |
| `cacheWrite` | 1q | 1q | 1q (unchanged) | — |
| `historyCreate` | 1q blocking | 1q blocking | non-blocking | −1 blocking |
| **Total blocking** | **7q** | **5-6q** | **≤4q** | **−3 to −2** |

## Requirements

- Functional: Authorization preserved — users must not translate against passages they do not own.
- Functional: Cache hit returns same response shape.
- Functional: History creation preserved, just deferred.
- Non-functional: Cache-hit response does not wait on unnecessary work.
- Non-functional: Single-word dictionary hit reaches ≤4 blocking queries after this phase.

## Architecture

Current path after Phase 1:

1. Authenticate user.
2. Fetch owned passage source (`sourceFetch`, 1q).
3. Read translation cache (`cacheRead`, 1q, miss on first request).
4. Dictionary resolve (1-2q after Phase 1).
5. Write cache (`cacheWrite`, 1q).
6. Create translation history (`historyCreate`, 1q blocking).

Optimizations:

1. **Combine `sourceFetch` + `cacheRead`**: Query cache with `userId` + `sourceId` + `cacheKey`. If cache hit, ownership proven — skip `sourceFetch`. If cache miss, fetch source for ownership — skip redundant `cacheRead`. Target: 1 read instead of 2.
2. **Defer `historyCreate`**: Move out of blocking path. Explicit background pattern with error logging, not unobserved promise.

## Code Location Map

| Function | File | Line | Shared? |
|----------|------|------|---------|
| `getOwnedTranslationSource()` | `src/lib/db/translation-queries.ts` | :66 | **Shared** — `/api/vocabulary` at `:78` |
| `getTranslationCache()` | `src/lib/db/translation-queries.ts` | :73 | No |
| `createTranslationHistory()` | `src/lib/db/translation-queries.ts` | :104 | No |

**Strategy:** Route-level changes only. Do NOT modify shared function signatures.

## Related Code Files

- Modify: `src/app/api/translate/route.ts` — reorder sourceFetch/cacheRead, defer historyCreate (lines 138-178, 249, 373-398)
- Read only: `src/lib/db/translation-queries.ts`
- Read only: `src/app/api/vocabulary/route.ts`
- Verify: `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`

## Implementation Steps

1. Review whether `TranslationCache` can be safely queried by `cacheKey` plus `userId` and `sourceId`.
2. Add route-level helper: cache hit → ownership proven, skip `sourceFetch`; cache miss → only `sourceFetch`, skip `cacheRead`.
3. Move `createTranslationHistory()` out of blocking path with fire-and-forget + error logging.
4. Add cross-user rejection test.
5. Run `pnpm test:performance` — verify 1 fewer query, historyCreate non-blocking.

## Success Criteria

- [ ] Single-word dictionary hit reaches **≤4 blocking Prisma queries** (down from 7).
- [ ] `sourceFetch` + `cacheRead` combined — at most 1 blocking read.
- [ ] `historyCreate` is non-blocking.
- [ ] Authorization preserved (cross-user access rejected).
- [ ] Failed async history writes logged, do not crash route.
- [ ] Route total meaningfully below 778ms baseline.

## Risk Assessment

Risk: Removing `sourceFetch` can weaken authorization if cache key validation is misunderstood.
Mitigation: Keep user/source ownership in query predicate, add negative cross-user test before changing route order.
