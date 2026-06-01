# Test Strategy

The repository uses one top-level `tests/` tree for executable test assets.

## Test Types

| Type | Tool | Location | Naming | Purpose |
| --- | --- | --- | --- | --- |
| Unit | Vitest | `tests/vitest/unit/` or `src/**` | `*.test.ts` | Pure logic or one narrow module with mocked boundaries. |
| Component | Vitest + React Testing Library | `tests/vitest/integration/components/` | `*.integration.test.tsx` | User-facing component behavior with framework and service boundaries mocked. |
| Integration | Vitest | `tests/vitest/integration/` | `*.integration.test.ts` | Multiple app modules together with live providers and database mocked. |
| Smoke | Vitest or Playwright | `tests/vitest/smoke/`, `tests/e2e/smoke.spec.ts` | `*.test.tsx`, `*.spec.ts` | Minimal proof that the test stack and app entrypoints are wired. |
| E2E | Playwright | `tests/e2e/` | `*.spec.ts` | Real browser flow through public or authenticated routes. |
| Performance | Custom TS runner | `tests/performance/` | `*-benchmark.ts` | Real app server and database with query and timing budgets. |

## Folders

- `tests/vitest/` contains Vitest unit, component, integration, smoke, mock, helper, fixture, and setup files.
- `tests/e2e/` contains Playwright specs, auth setup, E2E helpers, and Playwright-specific docs.
- `tests/performance/` contains API benchmark runners and benchmark helpers.
- `tests/fixtures/` contains shared file fixtures used by manual, E2E, and integration workflows.

## Rules

- Keep Playwright-only helpers and docs beside the Playwright specs in `tests/e2e/`.
- Keep benchmark scenarios and reports separate from Vitest and Playwright.
- Keep reusable upload files under `tests/fixtures/upload-files/`, not under docs.
- Keep manual and operational QA documentation under `docs/quality-assurance/`.
