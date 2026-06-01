---
phase: 3
title: "Benchmark Gate and Documentation"
status: pending
priority: P2
effort: "3h"
dependencies: [1, 2]
---

# Phase 3: Benchmark Gate and Documentation

## Overview

Now that the cuts are real, fit the benchmark gate to the optimized state. Add budget enforcement, warm-up handling, and documentation so regressions are caught.

## Requirements

- Functional: Benchmark reports all 4 scenarios but **budget gate focuses on single-word dictionary hit**.
- Functional: Distinguish warm-up samples from measured samples.
- Non-functional: Budgets gate on Prisma query count first, then route `totalMs`, then `roundTripMs`.
- Non-functional: Fallback/miss budgets are informational — tracked but not hard failures.

## Architecture

Extend `scripts/performance/translate-flow-benchmark.ts` (not replace). Add warm-up execution, then compare collected metrics against budget constants.

Budget constants — single-word hit is **hard gate**, others are soft warnings:

| Scenario | Before cuts | After cuts | Budget | Gate type |
|----------|-------------|------------|--------|-----------|
| single-word-dictionary | 7q | ≤4q | ≤4 queries | **hard fail** |
| cache-repeat | 3q | ≤2q | ≤2 blocking queries | soft warn |
| phrase-dictionary | 7q | ≤4q | ≤4 queries | soft warn |
| fallback | 9q | ≤5q | ≤5 queries | soft warn (deferred) |

## Related Code Files

- Modify: `scripts/performance/translate-flow-benchmark.ts`
- Modify: `tests/performance/README.md`
- Create: `src/lib/dictionary/resolve-dictionary-lookup.test.ts` (if not created in Phase 1)
- Verify: `__tests__/api/translation-vocabulary-routes.test.ts`

## Implementation Steps

1. Add warm-up request before measured scenarios — run single-word once, discard.
2. Add budget constants for query count per scenario.
3. Budget validation fails script only for single-word hit (hard), others warn (soft).
4. Include `budget`, `actual`, `passed` fields in `test-results/performance/translate-flow.json`.
5. Add unit tests for: exact hit, alias hit, cache hit, cross-user rejection, miss/fallback.
6. Update `tests/performance/README.md` with budgets and how to update them.
7. Run `pnpm run test` + `pnpm run typecheck` — no regressions.
8. Save final benchmark artifact, document before/after query counts.

## Success Criteria

- [ ] First request/cold overhead excluded from pass/fail decisions.
- [ ] Single-word hit budget gate (≤4 queries) **fails** the benchmark run.
- [ ] Other scenarios produce soft warnings, not hard failures.
- [ ] Unit/API tests cover optimized paths.
- [ ] README documents single-word hit query count as primary optimization target.
- [ ] Final benchmark shows improvement against 2026-06-01 baseline.

## Risk Assessment

Risk: Budgets may be flaky if based on wall-clock timings alone.
Mitigation: Gate primarily on Prisma query count, use time budgets as secondary warnings.
