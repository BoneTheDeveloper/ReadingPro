---
phase: 5
title: "Benchmark Docs Verification"
status: pending
priority: P1
effort: "2h"
dependencies: [2, 3, 4]
---

# Phase 5: Benchmark Docs Verification

## Overview

Tighten dictionary query-count budgets, regenerate performance results, and
update docs to match the grouped raw SQL implementation.

## Requirements

- Functional: benchmark asserts one query for each non-short dictionary read
  scenario.
- Functional: docs say grouped raw SQL is implementation detail, API contracts
  unchanged.
- Non-functional: latency budgets remain soft until production baselines are
  stable.

## Architecture

The benchmark remains the hard gate for query count. Update only query budgets
and documentation for this grouped-query round. Do not add DB index claims or
production latency SLA language.

## Related Code Files

- Modify:
  `tests/performance/dictionary-flow-benchmark.ts`
- Modify:
  `docs/API/Routes/dictionary-feature.md`
- Modify:
  `test-results/performance/dictionary-flow.md`
- Modify:
  `test-results/performance/dictionary-flow.json`
- Read:
  `tests/performance/README.md`

## Implementation Steps

### Tests Before

1. Confirm existing benchmark report currently shows split-query counts.
2. Confirm route/service tests from phases 1-4 pass before budget tightening.

### Refactor

1. Update dictionary query budgets:
   - `suggest-short-query`: `0`
   - `suggest-headword-prefix`: `1`
   - `suggest-alias-prefix`: `1`
   - `search-exact-headword`: `1`
   - `lookup-exact-headword`: `1`
   - `lookup-exact-alias`: `1`
   - `lookup-miss`: `1`
   - `entry-detail-by-id`: `1`
2. Keep latency budgets soft.
3. Update dictionary flow docs performance section to describe grouped raw SQL
   reads and out-of-scope index tuning.
4. Regenerate dictionary performance artifacts.

### Tests After

1. Run full typecheck.
2. Run focused dictionary tests.
3. Run dictionary performance benchmark.

Regression gate:

```bash
pnpm run typecheck
pnpm exec vitest src/lib/dictionary tests/vitest/integration/api/dictionary-suggest-route.test.ts tests/vitest/integration/api/dictionary-lookup-route.test.ts tests/vitest/integration/api/dictionary-entry-detail-route.test.ts
pnpm test:performance -- --suite=dictionary
```

## Success Criteria

- [ ] Dictionary benchmark passes with one-query budgets.
- [ ] `test-results/performance/dictionary-flow.md` reflects new query counts.
- [ ] Docs separate this plan from future DB index optimization.
- [ ] No public API contract changes documented.

## Risk Assessment

- Risk: dev-server latency remains noisy. Mitigation: keep latency soft and
  evaluate production mode separately.
- Risk: performance fixture setup obscures route metrics. Mitigation: compare
  per-scenario `performance.prisma.steps`, not only round-trip time.
