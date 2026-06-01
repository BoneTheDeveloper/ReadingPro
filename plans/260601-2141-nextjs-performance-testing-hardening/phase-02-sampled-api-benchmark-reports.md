---
phase: 2
title: Sampled API Benchmark Reports
status: completed
priority: P1
effort: 3h
dependencies:
  - 1
---

# Phase 2: Sampled API Benchmark Reports

## Overview

Replace single-sample route timing with repeated samples and percentile stats. Query-count validation remains strict; latency becomes statistically useful.

## Requirements

- Functional: add `--samples=<n>` CLI option with safe default.
- Functional: run each measured scenario N times after existing warm-up.
- Functional: report `min`, `median`, `p95`, `max`, and raw samples for `roundTripMs`.
- Non-functional: keep output backward-friendly enough for humans and future CI comparison.

## Architecture

Add shared helpers in `benchmark-utils.ts`:

```ts
type TimingStats = {
  samples: number[];
  min: number;
  median: number;
  p95: number;
  max: number;
};
```

Runner parses `--samples`, passes it through `BenchmarkContext` or suite options. Each scenario function is either wrapped by a generic repeated-run helper or split into "single run" + "aggregate report" shape.

Keep validation per run:

- Response correctness checked each sample.
- Prisma metric shape checked each sample.
- Query budget checked using max query count or every sample.

## Related Code Files

- Modify: `tests/performance/run-benchmarks.ts`
- Modify: `tests/performance/benchmark-utils.ts`
- Modify: `tests/performance/translate-flow-benchmark.ts`
- Modify: `tests/performance/dictionary-flow-benchmark.ts`
- Modify: `tests/performance/README.md`

## Implementation Steps

1. Add CLI parsing for `--samples` / `--samples=<n>`.
2. Validate samples:
   - integer
   - `>=1`
   - cap at reasonable max, e.g. `50`, unless overridden later.
3. Add `BenchmarkRunOptions` or extend context with `samples`.
4. Add shared percentile/stat helper:
   - sort copy of samples
   - median
   - p95 nearest-rank or consistent percentile method
5. Refactor translate scenarios:
   - keep fixture setup once
   - run scenario request N times
   - aggregate timing samples
   - keep representative latest performance payload or aggregate Prisma max totals
6. Refactor dictionary scenarios the same way.
7. Update JSON reports to include stats.
8. Update README command examples:
   - `pnpm test:performance -- --samples=10`

## Success Criteria

- [x] `pnpm test:performance -- --samples=1` behaves like current run plus new stats shape.
- [x] `pnpm test:performance -- --suite=dictionary --samples=5` runs each scenario five times.
- [x] Reports include raw samples and percentile stats.
- [x] Query budget failures still fail the process.
- [x] Existing fixture cleanup still runs on failures.

## Risk Assessment

Medium risk. Repeated samples can mutate cache/history state. For cache-sensitive scenarios, define expected behavior explicitly: either each repeat is expected to hit cache, or scenario setup must reset state. Avoid accidentally changing what query budgets mean.
