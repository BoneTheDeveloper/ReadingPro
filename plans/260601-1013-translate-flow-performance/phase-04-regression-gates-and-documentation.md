---
phase: 4
title: "Regression Gates and Documentation"
status: pending
priority: P2
effort: "3h"
dependencies: [1, 2, 3]
---

# Phase 4: Regression Gates and Documentation

## Overview

Lock the gains into the test suite and project docs so the translate flow does not drift back to high query counts.

## Requirements

- Functional: Performance regression command must be easy to run locally.
- Functional: Tests must cover the optimized lookup and cache-hit behavior.
- Non-functional: Documentation must distinguish test-report gaps from measured performance bottlenecks.
- Non-functional: CI/local scripts should fail loudly on query-count regressions but avoid flaky cold-start timing failures.

## Architecture

Use two guard layers:

1. Unit/API tests for deterministic behavior and query-shape assumptions.
2. `pnpm test:performance` budget checks for end-to-end route behavior.

Do not rely on Playwright browser installation for this performance gate; the current benchmark is Node/fetch based and already avoids the E2E browser dependency that the May 29 test report flagged.

## Related Code Files

- Modify: `tests/performance/README.md`
- Modify: `scripts/performance/translate-flow-benchmark.ts`
- Modify: `__tests__/api/translation-vocabulary-routes.test.ts`
- Maybe create: `src/lib/dictionary/resolve-dictionary-lookup.test.ts`
- Maybe update: `plans/reports/test-report-2026-05-29-comprehensive.md` only if the team wants the old report annotated rather than replaced

## Implementation Steps

1. Add tests around the optimized quick lookup path.
2. Add API assertions for performance metrics shape and scenario resolution source.
3. Document the accepted budgets and how to update them when the schema or hosting environment changes.
4. Add a short note that Playwright setup remains an E2E infrastructure issue, not the translate-flow bottleneck.
5. Run `pnpm run test`, `pnpm run typecheck`, and `pnpm test:performance`.
6. Save the final benchmark artifact and summarize before/after query counts in the implementation PR.

## Success Criteria

- [ ] Single-word dictionary hit query-count budget (≤4) is enforced by `pnpm test:performance`.
- [ ] Unit/API tests cover exact hit, alias hit, cache hit, and authorization behavior for single-word path.
- [ ] Documentation explains the single-word hit optimization path and query cut progression (7→4).
- [ ] Final benchmark shows improvement against the current artifact from `2026-06-01T03:01:48.872Z`.
- [ ] Fallback/miss path budgets are tracked but not hard gates.

## Risk Assessment

Risk: Performance budgets can become stale as the app gains features.
Mitigation: Store budgets near the benchmark script with comments tying them to user-visible route behavior and require PRs to justify budget increases.
