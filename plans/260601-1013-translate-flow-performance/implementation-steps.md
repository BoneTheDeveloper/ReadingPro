---
title: "Implementation Steps"
description: "Step-by-step execution for single-word dictionary hit performance optimization. Cuts first, gate last."
status: in-progress
priority: P1
---

# Implementation Steps

**Goal:** Single-word dictionary hit from 7 queries (778ms) → ≤4 blocking queries.

Each step is atomic: implement → verify.

---

## Step 1: Lean dictionary lookup (Phase 1)

**Why first:** Biggest single cut (3→1-2 queries, ~330ms).

**Code locations:**
- `src/lib/dictionary/resolve-dictionary-lookup.ts` — add new helper here
- `src/lib/dictionary/resolve-quick-dictionary-translation.ts:25` — wire it here
- Do NOT touch `findEntryByHeadword()` (:68) or `findEntryByAlias()` (:85) — shared with `/api/dictionary`

- [ ] Create `resolveQuickDictionaryLookupSql()` in `src/lib/dictionary/resolve-dictionary-lookup.ts` using single `$queryRaw` with LEFT JOINs on `DictionaryEntry` + `DictionaryAlias`, ordered by exact-before-alias, lowest `usageRank`, lowest `rank`
- [ ] Wire it in `resolve-quick-dictionary-translation.ts:25` — replace `resolveQuickDictionaryLookup()` call
- [ ] Add tests: exact hit, alias hit, miss/fallback
- [ ] Run `pnpm test:performance` — verify query count drops from 7 → 5-6

**Expected:** dictionaryResolve 3→1-2 queries. Total 5-6 queries.

---

## Step 2: Combine sourceFetch + cacheRead (Phase 2)

**Why next:** Second biggest cut (2 reads → 1).

**Code locations:**
- `src/app/api/translate/route.ts` (lines 138-178) — reorder here
- `src/lib/db/translation-queries.ts:66` — `getOwnedTranslationSource()` (read only, do NOT modify)
- `src/lib/db/translation-queries.ts:73` — `getTranslationCache()` (translate-only)

- [ ] Add combined helper: cache hit → ownership proven, skip `sourceFetch`; cache miss → only `sourceFetch`, skip `cacheRead`
- [ ] Do NOT modify `getOwnedTranslationSource()` signature — `/api/vocabulary` uses it
- [ ] Add cross-user rejection test
- [ ] Run `pnpm test:performance` — verify 1 fewer query

**Expected:** total drops to 4-5 queries.

---

## Step 3: Defer historyCreate (Phase 2)

**Why last of the cuts:** Smallest impact on user-visible latency.

**Code locations:**
- `src/app/api/translate/route.ts` line 249 (`persistTranslationResult`)
- `src/lib/db/translation-queries.ts:104` — `createTranslationHistory()` (translate-only)

- [ ] Move `createTranslationHistory()` out of blocking path
- [ ] Fire-and-forget with error logging (no unobserved promise)
- [ ] Route returns immediately after `cacheWrite` + response construction
- [ ] Run `pnpm test:performance` — `historyCreate` no longer counts as blocking

**Expected:** ≤4 blocking queries. This is the target.

---

## Step 4: Add benchmark gate (Phase 3)

**Why now:** Cuts are done. Lock them with a gate.

- [ ] Add warm-up pass to benchmark: run single-word once, discard, then measure
- [ ] Add budget constants: single-word ≤4 queries (hard fail), others soft warn
- [ ] Include `budget`, `actual`, `passed` in `test-results/performance/translate-flow.json`
- [ ] Run benchmark — should **pass** at ≤4 queries

**Expected:** benchmark passes with budget gate enforced.

---

## Step 5: Tests + docs + lock (Phase 3)

- [ ] Add unit tests for: exact hit, alias hit, cache hit, cross-user rejection, miss/fallback
- [ ] Update `tests/performance/README.md` with budgets and how to update them
- [ ] Run `pnpm run test` + `pnpm run typecheck` — no regressions
- [ ] Save final benchmark artifact, document before/after in PR

**Expected:** full coverage, documented budgets, PR-ready.

---

## Summary

| Step | Phase | What | Expected queries |
|------|-------|------|------------------|
| 1 | 1 | Lean dictionary lookup | 5-6 |
| 2 | 2 | Combine sourceFetch + cacheRead | 4-5 |
| 3 | 2 | Defer historyCreate | ≤4 blocking |
| 4 | 3 | Add benchmark gate | gate passes |
| 5 | 3 | Tests + docs + lock | PR-ready |
