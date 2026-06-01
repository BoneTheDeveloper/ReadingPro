---
phase: 3
title: "Soft Latency Budgets"
status: completed
priority: P2
effort: "2h"
dependencies: [2]
---

# Phase 3: Soft Latency Budgets

## Overview

Add p95/median latency budgets as soft warnings. Query counts remain the only hard performance gate until CI timing is stable.

## Requirements

- Functional: define latency budgets per scenario.
- Functional: evaluate budgets against sampled stats.
- Functional: report soft failures without failing CI.
- Functional: support hard gate later without another model rewrite.
- Non-functional: avoid fake precision. Initial numbers are provisional.

## Architecture

Extend budget model rather than create a separate unrelated system:

```ts
type LatencyBudget = {
  medianRoundTripMs?: number;
  p95RoundTripMs?: number;
  gate: "soft" | "hard";
};
```

Reports should separate:

- `queryBudget`: current hard/soft Prisma query count.
- `latencyBudget`: new median/p95 budget.
- `latencyPassed`: boolean.
- `latencyFailures`: readable details.

## Related Code Files

- Modify: `tests/performance/benchmark-utils.ts`
- Modify: `tests/performance/translate-flow-benchmark.ts`
- Modify: `tests/performance/dictionary-flow-benchmark.ts`
- Modify: `tests/performance/README.md`
- Coordinate with: `plans/260601-1013-translate-flow-performance`

## Implementation Steps

1. Add latency budget types and validation helper.
2. Add provisional soft budgets after collecting a local baseline with Phase 2 samples.
3. Print soft warnings clearly:
   - scenario
   - metric
   - actual
   - budget
4. Do not throw for soft failures.
5. Preserve hard failure behavior for query budgets.
6. Document budget policy in README:
   - query count hard
   - latency soft until CI baseline is stable
   - hard latency gates require later decision

## Success Criteria

- [x] Report includes latency budget fields for scenarios with configured budgets.
- [x] Soft latency failure prints warning but exits 0 when query budgets pass.
- [x] Hard query budget failure still exits non-zero.
- [x] README documents why latency is soft.

## Risk Assessment

Medium risk. Bad initial latency budgets will create noise. First implementation should use conservative soft values and treat numbers as learning data.
