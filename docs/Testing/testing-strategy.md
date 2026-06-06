# Testing Strategy

## Canonical Rule Docs

Detailed test rules live beside the executable test assets:

- [../../tests/README.md](../../tests/README.md) - test suite structure and naming rules.
- [../../playwright/README.md](../../playwright/README.md) - local Playwright playground setup and authoring rules.
- [../../tests/performance/README.md](../../tests/performance/README.md) - performance benchmark runner.
- [../../tests/performance/query-budget-benchmarks.md](../../tests/performance/query-budget-benchmarks.md) - route query budgets.

This `docs/` page is the architecture-level testing overview only. Do not duplicate detailed suite rules here.

## Test Layers

| Layer | Tool | Canonical detail |
|-------|------|------------------|
| Unit/component/integration/smoke | Vitest + Testing Library | [../../tests/README.md](../../tests/README.md) |
| Local E2E and screenshots | Playwright | [../../playwright/README.md](../../playwright/README.md) |
| Performance/query budgets | Custom TS runner | [../../tests/performance/README.md](../../tests/performance/README.md) |
| API contracts | Vitest/focused route tests | [contract-tests.md](contract-tests.md) |

## Required Checks

Before production-sensitive changes:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm build
```

Run Playwright or performance suites when the change affects those areas.
