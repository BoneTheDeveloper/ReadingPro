---
phase: 1
title: "Bottleneck Baseline and Performance Budgets"
status: pending
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Bottleneck Baseline and Performance Budgets

## Overview

Turn the current ad hoc benchmark into an enforceable baseline focused on the single-word dictionary hit path. Budgets for other scenarios are tracked but not blockers for this iteration.

## Requirements

- Functional: Benchmark must report all 4 scenarios but **budget gate focuses on single-word dictionary hit**.
- Functional: Benchmark must distinguish warm-up samples from measured samples.
- Non-functional: Budgets focus on Prisma query count first, then route `totalMs`, then `roundTripMs`.
- Non-functional: Budget failures should produce actionable output showing the scenario, metric, actual value, and expected ceiling.
- Non-functional: Fallback/miss scenario budgets are informational only — tracked but not failing the run.

## Architecture

Keep the existing `scripts/performance/translate-flow-benchmark.ts` flow and extend it rather than replacing it. Add warm-up execution before measured scenarios, then compare the collected `performance.prisma` and `performance.timings` values against local budget constants.

Budget constants — single-word hit is the **hard gate**, others are soft warnings:

| Scenario | Current queries | Target budget | Gate type |
|----------|-----------------|---------------|-----------|
| single-word-dictionary | 7 | <= 4 queries | **hard fail** |
| cache-repeat | 3 | <= 2 blocking queries | soft warn |
| phrase-dictionary | 7 | <= 4 queries | soft warn |
| fallback | 9 | <= 5 queries | soft warn (deferred) |

## Related Code Files

- Modify: `scripts/performance/translate-flow-benchmark.ts`
- Modify: `tests/performance/README.md`
- Read: `test-results/performance/translate-flow.json`
- Read: `src/lib/translation/translate-performance.ts`

## Implementation Steps

1. Add a warm-up request before measured scenarios, or run each scenario once and mark the first sample as warm-up.
2. Add budget constants for query count, Prisma duration, and route duration per scenario.
3. Make budget validation fail the script only for measured samples, not warm-up samples.
4. Include `budget`, `actual`, and `passed` fields in `test-results/performance/translate-flow.json`.
5. Update `tests/performance/README.md` with how to interpret `route total`, `roundTripMs`, and Prisma metrics.
6. Capture the current baseline before optimization so later phases can show before/after movement.

## Success Criteria

- [ ] First request/cold overhead is excluded from pass/fail budget decisions.
- [ ] **Single-word dictionary hit** budget gate (≤4 queries) fails the benchmark run.
- [ ] Other scenarios produce soft warnings, not hard failures.
- [ ] Benchmark output makes it obvious whether a regression is route work, DB work, or network/cold overhead.
- [ ] README documents that single-word hit query count is the primary optimization target.

## Risk Assessment

Risk: Budgets may be flaky if based on wall-clock timings alone.
Mitigation: Gate primarily on Prisma query count, then use time budgets as secondary warning thresholds.
