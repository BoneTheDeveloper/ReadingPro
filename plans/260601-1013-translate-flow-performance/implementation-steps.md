---
title: "Implementation Steps"
description: "Step-by-step execution order for single-word dictionary hit performance optimization. Each step is measurable and builds on the last."
status: in-progress
priority: P1
---

# Implementation Steps

**Goal:** Single-word dictionary hit from 7 queries (778ms) → ≤4 queries (<400ms).

Each step is atomic: implement → run benchmark → verify.

---

## Step 1: Make the benchmark fail (Phase 1)

**Why first:** Can't measure progress without a gate.

- [ ] Add budget constants to `scripts/performance/translate-flow-benchmark.ts` — single-word hit `queryCount <= 7` (current, will tighten later)
- [ ] Add warm-up pass: run single-word scenario once, discard, then measure
- [ ] Make single-word hit budget **hard fail** the script; other scenarios = soft warn
- [ ] Run it — should **pass** at current 7 queries (baseline locked)

**Expected:** benchmark passes, baseline captured.

---

## Step 2: Tighten budget to force the cut (Phase 1)

- [ ] Change single-word hit budget from `<= 7` → `<= 5` (target after Step 3)
- [ ] Run benchmark — should **fail** (proves the gate works)

**Expected:** benchmark fails on query count, proving the gate is real.

---

## Step 3: Add lean dictionary lookup helper (Phase 2)

**Why next:** Biggest single cut (3→1-2 queries, ~330ms).

**Code locations:**
- `src/lib/dictionary/resolve-dictionary-lookup.ts` — add new helper here
- `src/lib/dictionary/resolve-quick-dictionary-translation.ts:25` — wire it here
- Do NOT touch `findEntryByHeadword()` (:68) or `findEntryByAlias()` (:85) — shared with `/api/dictionary`

- [ ] Create new function `resolveQuickDictionaryLookupSql()` in `src/lib/dictionary/resolve-dictionary-lookup.ts` using single `$queryRaw` with LEFT JOINs on `DictionaryEntry` + `DictionaryAlias`, ordered by exact-before-alias, lowest `usageRank`, lowest `rank`
- [ ] Do NOT touch `findEntryByHeadword()` or `findEntryByAlias()` — those serve `/api/dictionary`
- [ ] Wire it in `resolve-quick-dictionary-translation.ts:25` — replace `resolveQuickDictionaryLookup()` call with new helper
- [ ] Run benchmark — should now **pass** at ≤5 queries

**Expected:** single-word hit drops from 7 → 5-6 queries. Benchmark passes at `<= 5`.

---

## Step 4: Tighten budget again (Phase 1 revisit)

- [ ] Change budget from `<= 5` → `<= 4` (final target)
- [ ] Run benchmark — should **fail** (proves we still have work)

**Expected:** benchmark fails, gap shows 1-2 more queries to cut.

---

## Step 5: Combine sourceFetch + cacheRead at route level (Phase 3)

**Why now:** Second biggest cut (2 reads → 1).

**Code locations:**
- `src/app/api/translate/route.ts` (lines 138-178) — reorder here
- `src/lib/db/translation-queries.ts:66` — `getOwnedTranslationSource()` (read only, do NOT modify)
- `src/lib/db/translation-queries.ts:73` — `getTranslationCache()` (translate-only)
- Shared: `/api/vocabulary` uses `getOwnedTranslationSource()` at `src/app/api/vocabulary/route.ts:78`

- [ ] In `src/app/api/translate/route.ts` (lines 138-178), add a combined helper that queries `TranslationCache` with `userId` + `sourceId` + `cacheKey`
- [ ] If cache hit → ownership proven by cache ownership, skip `sourceFetch`
- [ ] If cache miss → only then do `sourceFetch`, skip redundant `cacheRead`
- [ ] Do NOT modify `getOwnedTranslationSource()` signature — `/api/vocabulary` uses it
- [ ] Add cross-user rejection test
- [ ] Run benchmark — should show 1 fewer query

**Expected:** single-word hit drops 1 more query. Close to ≤4.

---

## Step 6: Defer historyCreate (Phase 3)

**Why last of the cuts:** Smallest impact on user-visible latency.

**Code locations:**
- `src/app/api/translate/route.ts` line 249 (`persistTranslationResult`)
- `src/lib/db/translation-queries.ts:104` — `createTranslationHistory()` (translate-only, safe to change call site)

- [ ] In `src/app/api/translate/route.ts` (line 249, `persistTranslationResult`), move `createTranslationHistory()` out of blocking path
- [ ] Use fire-and-forget with error logging (no unobserved promise)
- [ ] Route returns immediately after `cacheWrite` + response construction
- [ ] Run benchmark — `historyCreate` no longer counts as blocking query

**Expected:** single-word hit at ≤4 blocking queries. Benchmark should now pass at `<= 4`.

---

## Step 7: Run benchmark — must pass ≤4 (Phase 4)

- [ ] `pnpm test:performance` — single-word hit ≤4 queries, green
- [ ] Save artifact, compare against baseline (778ms → target <400ms)
- [ ] Run `pnpm run test` + `pnpm run typecheck` — no regressions

**Expected:** all green. Performance gate locked at ≤4.

---

## Step 8: Lock it in (Phase 4)

- [ ] Add unit tests for: exact hit, alias hit, cache hit, cross-user rejection, miss/fallback
- [ ] Update `tests/performance/README.md` with budgets and how to update them
- [ ] Document before/after query counts in PR

**Expected:** full test coverage, documented budgets, PR-ready.

---

## Summary

| Step | Phase | What | Budget | Expected queries |
|------|-------|------|--------|------------------|
| 1 | 1 | Add benchmark gate + warm-up | ≤7 (pass) | 7 (baseline) |
| 2 | 1 | Tighten budget | ≤5 (fail) | 7 (unchanged) |
| 3 | 2 | Lean dictionary lookup | ≤5 (pass) | 5-6 |
| 4 | 1 | Tighten budget | ≤4 (fail) | 5-6 (unchanged) |
| 5 | 3 | Combine sourceFetch + cacheRead | ≤4 | 4-5 |
| 6 | 3 | Defer historyCreate | ≤4 (pass) | ≤4 blocking |
| 7 | 4 | Full benchmark + typecheck | ≤4 (pass) | ≤4 |
| 8 | 4 | Tests + docs + PR | — | — |

3 budget tightenings: prove gate → prove improvement → final lock.
