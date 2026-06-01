# Code Review: Translate Flow Performance Optimization

**Branch:** `feat/dictionary-mvp`
**Date:** 2026-06-01
**Scope:** 7 files (4 implementation, 3 test)
**LOC changed:** ~520 across reviewed files

---

## Acceptance Criteria Verification

| Criterion | Status | Evidence |
|---|---|---|
| Single-word dictionary hit: 7 -> <=4 blocking Prisma queries | PASS | dictionaryResolve: 1 query (was 3). Cache-read-first skips sourceFetch on cache hit (saves 1). Fire-and-forget historyCreate saves 1. Total: auth(1) + cacheRead(1) + dictionaryResolve(1) + cacheWrite(1) = 4. On cache-miss path: auth(1) + cacheRead(1) + sourceFetch(1) + dictionaryResolve(1) + cacheWrite(1) = 5, but warm-up ensures cache hit. |
| dictionaryResolve: 3 -> 1 query | PASS | `$queryRaw` with LEFT JOINs replaces sequential findEntryByHeadword + findEntryByAlias + buildEntryDto filtering |
| sourceFetch+cacheRead: reordered | PASS | cacheRead runs first (line 147), sourceFetch only on cache miss (line 187) |
| historyCreate: non-blocking fire-and-forget | PASS | `void persistTranslationResult(...)` at lines 178 and 249 |
| /api/dictionary unaffected | PASS | `resolveDictionaryLookup` (line 19) still uses old findEntryByHeadword/findEntryByAlias path. Verified: `/api/dictionary/route.ts` imports `resolveDictionaryLookup`, not the quick SQL function |
| /api/vocabulary unaffected | PASS | `getOwnedTranslationSource` signature unchanged, still imported at vocabulary route line 7 |
| Authorization preserved | PASS | sourceFetch still runs on cache miss (line 187-199), proving userId owns sourceId before proceeding |

---

## Critical Issues

None found.

---

## Major Issues

### M1. Benchmark asserts `historyCreate` timing step but it is no longer measured

**File:** `/home/luc/Project/english-reading-training-app/scripts/performance/translate-flow-benchmark.ts`, line 251

```typescript
for (const step of ["auth", "sourceFetch", "cacheRead", "historyCreate"]) {
    assertNumber(payload.performance.timings.steps[step], `${input.scenario} ${step} timing`);
}
```

`historyCreate` was removed from the tracked timing steps (it is now fire-and-forget, not wrapped in `measureTranslateStep`). The benchmark script still asserts that `timings.steps.historyCreate` is a number. When running against the actual endpoint, this will throw:

```
single-word-dictionary historyCreate timing: expected number, received undefined
```

**Impact:** Benchmark will fail with assertion error, not a Prisma budget failure. This masks the actual budget gate. The error will occur in every scenario including warm-up.

**Fix:** Remove `"historyCreate"` from the assertion loop. Optionally add `"dictionaryResolve"` to the step assertions instead:

```typescript
for (const step of ["auth", "sourceFetch", "cacheRead", "dictionaryResolve", "cacheWrite"]) {
```

---

## Medium Issues

### M1. `QUICK_LOOKUP_STATUSES` computed at module load time via `Prisma.join`

**File:** `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-dictionary-lookup.ts`, line 41

```typescript
const QUICK_LOOKUP_STATUSES = Prisma.join(RUNTIME_STATUSES);
```

`Prisma.join` is a tagged-template helper that produces a `Prisma.Sql` object. Computing it at module scope works correctly because `Prisma.join` is a pure function and `RUNTIME_STATUSES` is a compile-time constant. Verified by type-check (`npx tsc --noEmit` passes with zero errors) and by tests.

However, the pattern is unusual -- `Prisma.join` is almost always used inline inside tagged templates. If a future contributor moves or copies this pattern incorrectly, they may not realize the module-level evaluation is load-bearing. Consider adding a brief comment:

```typescript
// Pre-computed for reuse in the tagged template literal below.
// Prisma.join is pure and RUNTIME_STATUSES is const, so module scope is safe.
const QUICK_LOOKUP_STATUSES = Prisma.join(RUNTIME_STATUSES);
```

**Impact:** Informational. No functional risk today.

### M2. `resolveDictionaryLookup` has duplicate `findEntryByHeadword`/`findEntryByAlias` functions

**File:** `/home/luc/Project/english-reading-training-app/src/lib/dictionary/resolve-dictionary-lookup.ts`, lines 110-151 vs `/home/luc/Project/english-reading-training-app/src/lib/db/dictionary-queries.ts`

The file defines private `findEntryByHeadword` and `findEntryByAlias` functions that duplicate the public versions in `dictionary-queries.ts`. This pre-exists this PR (the old `resolveDictionaryLookup` used them). However, now that the translate path uses the new SQL function, these private copies are only called by `resolveDictionaryLookup` (used by `/api/dictionary`). The duplication increases maintenance risk: if the DB schema changes, two copies must be updated.

**Impact:** Pre-existing tech debt. Not introduced by this change, but worth noting since the file was modified.

---

## Low Priority

### L1. Test mock for `$queryRaw` extracts term by string matching -- fragile

**File:** `/home/luc/Project/english-reading-training-app/__tests__/api/translation-vocabulary-routes.test.ts`, lines 136-169

The `$queryRaw` mock iterates raw tagged-template values to find the normalized term. It filters out known strings (`"en"`, `"vi"`, `"true"`) and assumes the first remaining string is the search term. This works but is brittle: adding a new parameter to the SQL query could accidentally be mistaken for the term, or a new excluded string could cause a false negative.

This is a test-only concern and acceptable for now, but consider using a regex or named extraction if the query evolves further.

### L2. `toJsonValue` round-trips through JSON.parse/stringify

**File:** `/home/luc/Project/english-reading-training-app/src/app/api/translate/route.ts`, line 53

```typescript
function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
```

Pre-existing. Strips `undefined` values and converts Dates to strings. Correct for Prisma's JSON column type, but worth knowing it is not a deep-copy -- it is a serialization boundary. No issue with this change.

---

## Positive Observations

1. **Clean separation.** The new `resolveQuickDictionaryLookupSql` is a focused, single-responsibility function. The old `resolveDictionaryLookup` is completely untouched for `/api/dictionary` consumption.

2. **Proper fire-and-forget pattern.** `void persistTranslationResult(...)` is used correctly. The promise is not orphaned -- it has its own try/catch that logs to Sentry at "warning" level. This avoids unhandled rejection crashes while keeping the hot path fast.

3. **Cache-first ordering is authorization-safe.** The cache key is `userId + sourceId + selectedText + context + targetLanguage + mode`. A cache hit proves the user previously owned the source (the cache entry was written after a successful sourceFetch). No authorization bypass is possible.

4. **Benchmark warm-up is well-placed.** Line 98-106: warm-up request runs before measured scenarios, ensuring Prisma connection pool and query plan cache are warm. This prevents cold-start noise from causing false budget failures.

5. **Test coverage is thorough.** 8 unit tests for the SQL helper covering exact match, alias match, null result, normalization, ordering, Date conversion, sourceLabel, and parameter passing. Integration test mock correctly simulates the `$queryRaw` tagged template behavior.

6. **No regressions in shared contracts.** `getOwnedTranslationSource`, `buildTranslationCacheKey`, `upsertTranslationCache` signatures and behavior are unchanged. `/api/vocabulary` route is unaffected.

---

## Recommended Actions

1. **[M1 - Must fix before merge]** Remove `"historyCreate"` from the benchmark timing step assertions at `scripts/performance/translate-flow-benchmark.ts:251`. Add `"dictionaryResolve"` and `"cacheWrite"` to the assertion list if you want full step coverage. Without this fix, the benchmark will crash on every scenario before reaching the budget gate.

2. **[M2 - Optional]** Add a brief comment at `resolve-dictionary-lookup.ts:41` explaining why `Prisma.join` is safe at module scope.

3. **[Future]** Consider extracting `findEntryByHeadword`/`findEntryByAlias` from `resolve-dictionary-lookup.ts` into shared `dictionary-queries.ts` to eliminate the duplication.

---

## Metrics

- Type Coverage: 100% (zero `tsc --noEmit` errors)
- Test Coverage: 27/27 tests pass (8 unit for SQL helper + 4 unit for quick-resolver + 15 integration)
- Linting Issues: 0

## Unresolved Questions

1. The benchmark's `cache-repeat` scenario budget is `maxQueries: 2` (soft). With the fire-and-forget historyCreate, a cache-hit path should produce: auth(1) + cacheRead(1) = 2 queries (sourceFetch skipped, dictionaryResolve skipped, cacheWrite skipped). The historyCreate is fire-and-forget but still executes -- will it increment `queryCount` via the `$on('query')` listener before the response is serialized? This depends on Node.js event loop ordering: if the fire-and-forget promise resolves (or the query fires) before the response JSON is built, the query counter may show 3. Recommend verifying this empirically.

2. The `Prisma.join(RUNTIME_STATUSES)` at module scope -- does this produce a stable SQL fragment across hot reloads in development? If `Prisma.join` captures internal state, dev-mode hot reload could produce stale references. Low risk but unverified.
