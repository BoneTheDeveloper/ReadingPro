---
title: Next.js Performance Testing Hardening
description: >-
  Harden the existing Next.js API performance benchmark before adding broader
  lab and field performance checks.
status: completed
priority: P2
branch: feat/dictionary-mvp
tags:
  - performance
  - nextjs
  - benchmark
  - ci
  - api
blockedBy: []
blocks: []
created: '2026-06-01T14:41:27.225Z'
createdBy: 'ck:plan'
source: skill
---

# Next.js Performance Testing Hardening

## Overview

This plan turns the current single-sample dev-server API benchmark into a more trustworthy performance safety net. Scope now: clarify docs, add repeated samples, report percentiles, add soft latency budgets, and support production-mode benchmarking.

The existing benchmark is valuable, but narrow. It catches API correctness, Prisma query counts, route timings, and fixture regressions for translate and dictionary flows. It does not measure full Next.js user performance: production runtime, browser rendering, hydration, LCP, INP, CLS, or bundle size.

## Current State

- `pnpm test:performance` runs `tests/performance/run-benchmarks.ts`.
- Owned benchmark server uses `next dev --turbopack`.
- Fixture routes require explicit env flags.
- Reports are written under `test-results/performance/`.
- Query-count budgets exist and should remain the hard gate.
- `roundTripMs` is one sample per scenario and should not be used as a hard latency gate yet.

## Related Plans

- `plans/260601-1013-translate-flow-performance`: owns translate hot-path query optimization and final translate query budget numbers.
- `plans/260601-1508-fast-translate-no-detail-mode`: depends on translate performance work and may need benchmark updates after API contract simplification.
- This plan owns benchmark infrastructure across translate and dictionary suites.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Clarify Current Benchmark](./phase-01-clarify-current-benchmark.md) | Completed |
| 2 | [Sampled API Benchmark Reports](./phase-02-sampled-api-benchmark-reports.md) | Completed |
| 3 | [Soft Latency Budgets](./phase-03-soft-latency-budgets.md) | Completed |
| 4 | [Production Mode Benchmark](./phase-04-production-mode-benchmark.md) | Completed |
| 5 | [Lighthouse And Web Vitals Follow-up](./phase-05-lighthouse-and-web-vitals-follow-up.md) | Completed |

## Dependencies

- Phase 3 latency budget values should be fitted after or alongside `plans/260601-1013-translate-flow-performance`.
- Phase 4 production-mode support can be built independently, but CI usage may wait until fixture routes and environment config are stable.
- Phase 5 is a follow-up design phase, not first implementation.

## Non-Goals

- Do not implement load/concurrency testing now.
- Do not add OpenTelemetry now.
- Do not add real-user analytics storage now.
- Do not turn latency budgets into hard gates until stable baseline data exists.
- Do not rewrite the benchmark into Playwright unless browser flows are explicitly added.

## Success Criteria

- README accurately describes what the current benchmark measures and does not measure.
- Runner accepts a sample count and emits percentile stats.
- Query-count budgets continue to fail hard.
- Latency budgets exist as soft warnings based on p95/median stats.
- Production-mode benchmark flow is documented and runnable.
- Follow-up scope for Lighthouse/Web Vitals is captured without blocking current API benchmark hardening.
