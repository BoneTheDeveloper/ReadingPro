---
phase: 3
title: "Write Path and Cache Efficiency"
status: pending
priority: P2
effort: "5h"
dependencies: [1, 2]
---

# Phase 3: Write Path and Cache Efficiency

## Overview

Cut the remaining queries on the single-word dictionary hit path to reach the ≤4 target. After Phase 2 collapses `dictionaryResolve` from 3→1-2, the remaining cuts are: combine `sourceFetch`+`cacheRead` into 1 read, and make `historyCreate` non-blocking.

Single-word hit query cut map (this phase targets `sourceFetch`, `cacheRead`, `historyCreate`):

| Step | Before Phase 2 | After Phase 2 | After this phase | Total cut |
|------|----------------|---------------|------------------|-----------|
| `sourceFetch` | 1q | 1q | merged with cacheRead | — |
| `cacheRead` | 1q | 1q | merged with sourceFetch | — |
| `dictionaryResolve` | 3q | 1-2q | 1-2q (unchanged) | — |
| `cacheWrite` | 1q | 1q | 1q (unchanged) | — |
| `historyCreate` | 1q | 1q | non-blocking | −1 blocking |
| **Total blocking** | **7q** | **5-6q** | **≤4q** | **−3 to −2** |

## Requirements

- Functional: Keep authorization: users must not translate against passages they do not own.
- Functional: Cache hit must still return the cached translation response shape.
- Functional: History creation behavior must be intentionally preserved, deferred, or explicitly changed with product approval.
- Non-functional: Cache-hit response should not wait on work that is not needed to build the response.
- Non-functional: Single-word dictionary hit (non-cache) should reach ≤4 blocking queries after this phase.

## Architecture

Current single-word hit path after Phase 2:

1. Authenticate user.
2. Fetch owned passage source (`sourceFetch`, 1q).
3. Read translation cache (`cacheRead`, 1q, miss on first request).
4. Dictionary resolve (1-2q after Phase 2).
5. Write cache (`cacheWrite`, 1q).
6. Create translation history (`historyCreate`, 1q blocking).

Candidate optimizations, in priority order:

1. **Combine `sourceFetch` + `cacheRead`**: Make cache lookup include `userId` and `sourceId` constraints derived from the request. If cache hit, ownership is proven without a separate source read. If cache miss, still need source fetch for ownership — but skip cacheRead since we know it's empty. Target: 1 read instead of 2.
2. **Defer `historyCreate`**: Move out of the blocking response path. Use an explicit background task pattern with logging, not an unobserved floating promise. If product insists on synchronous history, document it as intentional and the query budget becomes ≤4 blocking + 1 documented blocking.
3. For non-cache paths where cache is known empty, only fetch the passage for ownership — no redundant cache read needed.

## Code Location Map

### This phase's targets: `sourceFetch`, `cacheRead`, `historyCreate`

| Function | File | Line | Prisma op | Shared? |
|----------|------|------|-----------|---------|
| `getOwnedTranslationSource()` | `src/lib/db/translation-queries.ts` | :66 | `db.passage.findUnique` | **Shared** — also called by `/api/vocabulary` at `src/app/api/vocabulary/route.ts:78` |
| `getTranslationCache()` | `src/lib/db/translation-queries.ts` | :73 | `db.translationCache.findUnique` | Translate-only — called only by `src/app/api/translate/route.ts:178` |
| `createTranslationHistory()` | `src/lib/db/translation-queries.ts` | :104 | `db.translationHistory.create` | Translate-only — called only by `src/app/api/translate/route.ts:386` |

### Other flows that share `sourceFetch`

| Flow | Function | File | Line |
|------|----------|------|------|
| `/api/vocabulary` | `getOwnedTranslationSource()` | `src/app/api/vocabulary/route.ts` | :78 |

### Strategy: route-level changes, not query function changes

- Do NOT modify `getOwnedTranslationSource()` signature — `/api/vocabulary` depends on it.
- Combine `sourceFetch`+`cacheRead` at the **route level** in `src/app/api/translate/route.ts` (lines 138-178) by adding a new combined helper or reordering the route logic.
- `createTranslationHistory()` can be deferred at the route call site without changing the function itself.

## Related Code Files

- Modify: `src/app/api/translate/route.ts` — reorder sourceFetch/cacheRead, defer historyCreate (lines 138-178, 249, 373-398)
- Read only: `src/lib/db/translation-queries.ts` — do NOT modify shared function signatures
- Read only: `src/app/api/vocabulary/route.ts` — must not break
- Verify: `__tests__/api/translation-vocabulary-routes.test.ts`

## Implementation Steps

1. Review whether `TranslationCache` can be safely queried by `cacheKey` plus `userId` and `sourceId`.
2. Add a helper that returns cached translation only when the cache belongs to the authenticated user and requested source.
3. Reorder the translate route so cache hit can avoid redundant source fetch where safe.
4. Decide and document whether translation history is synchronous or deferred.
5. If deferred, add robust error logging for failed history writes and preserve route response shape.
6. Add tests proving cross-user/source cache access is rejected and cache-hit query count drops.
7. Re-run performance benchmark and update expected cache-hit budget.

## Success Criteria

- [ ] Single-word dictionary hit path reaches **≤4 blocking Prisma queries** total (down from 7).
- [ ] `sourceFetch` + `cacheRead` combined or one eliminated — at most 1 blocking read for ownership + cache.
- [ ] `historyCreate` is non-blocking, or the only documented remaining blocking query.
- [ ] Authorization remains covered by tests (cross-user access rejected).
- [ ] Cached response schema remains unchanged.
- [ ] Failed async history writes are logged and do not crash the route.
- [ ] Performance report shows single-word hit route total meaningfully below the 778ms baseline.

## Risk Assessment

Risk: Removing `sourceFetch` can weaken authorization if cache key validation is misunderstood.
Mitigation: Keep user/source ownership in the query predicate and add a negative cross-user test before changing route order.
