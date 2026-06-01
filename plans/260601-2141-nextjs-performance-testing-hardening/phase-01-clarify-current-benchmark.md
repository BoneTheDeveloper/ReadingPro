---
phase: 1
title: Clarify Current Benchmark
status: completed
priority: P1
effort: 1h
dependencies: []
---

# Phase 1: Clarify Current Benchmark

## Overview

Make the performance README honest and operational. The current benchmark is an API/query-budget harness running on a dev server, not a full Next.js performance test suite.

## Requirements

- Functional: document current commands, fixture flags, auth fallback, report paths, and suite scope.
- Non-functional: prevent false confidence by explicitly stating missing surfaces: production runtime, browser rendering, Web Vitals, bundle size, and load.

## Architecture

Documentation-only change. No benchmark behavior changes.

## Related Code Files

- Modify: `tests/performance/README.md`
- Reference: `tests/performance/run-benchmarks.ts`
- Reference: `tests/performance/benchmark-utils.ts`

## Implementation Steps

1. Read current `tests/performance/README.md` and preserve existing command details.
2. Add a short "Scope" section:
   - API route performance and query budgets.
   - Translate and dictionary scenario coverage.
   - Dev-server default.
3. Add a short "Not covered" section:
   - Production build timings.
   - LCP/INP/CLS.
   - Browser rendering/hydration.
   - Bundle regressions.
   - Load/concurrency.
4. Add "When to use" guidance:
   - Use before/after API route changes.
   - Use when changing Prisma queries, dictionary lookup, translate cache/history.
5. Mention production-mode support is planned in Phase 4.

## Success Criteria

- [ ] README calls this an API performance/query-budget benchmark.
- [ ] README states default server is `next dev --turbopack`.
- [ ] README lists missing Next.js/Web Vitals coverage.
- [ ] Existing command examples remain valid.

## Risk Assessment

Low risk. Main risk is editing over current uncommitted README changes. Read the file first and preserve unrelated edits.
