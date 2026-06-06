# Test Strategy

The repository uses `tests/` for Vitest suites, Vitest config, performance benchmarks, shared fixtures, and runner-agnostic test helpers. Local Playwright specs and config live in `playwright/`.

## Test Types

| Type | Tool | Location | Naming | Purpose |
| --- | --- | --- | --- | --- |
| Unit | Vitest | `tests/vitest/unit/` or `src/**` | `*.test.ts` | Pure logic or one narrow module with mocked boundaries. |
| Component | Vitest + React Testing Library | `tests/vitest/integration/components/` | `*.integration.test.tsx` | User-facing component behavior with framework and service boundaries mocked. |
| Integration | Vitest | `tests/vitest/integration/` | `*.integration.test.ts` | Multiple app modules together with live providers and database mocked. |
| Smoke | Vitest | `tests/vitest/smoke/` | `*.test.tsx` | Minimal proof that the Vitest stack and app entrypoints are wired. |
| Performance | Custom TS runner | `tests/performance/` | `*-benchmark.ts` | Real app server and database with query and timing budgets. |
| Local E2E/screenshots | Playwright | `playwright/tests/` | `*.spec.ts`, `*.setup.ts` | Local browser smoke checks and authenticated screenshots. |

## Folders

- `tests/vitest/` contains Vitest config, unit, component, integration, smoke, mock, helper, fixture, and setup files.
- `tests/performance/` contains API benchmark runners and benchmark helpers.
- `tests/shared/` contains runner-agnostic helpers used by more than one suite.
- `tests/fixtures/` contains shared file fixtures used by manual, E2E, and integration workflows.

## Rules

- Keep Playwright-only helpers, specs, configs, and docs in `playwright/`.
- Move helpers to `tests/shared/` when they are imported by Playwright plus another suite, such as performance benchmarks.
- Keep benchmark scenarios and reports separate from Vitest and Playwright.
- Keep reusable upload files under `tests/fixtures/upload-files/`, not under docs.
- Keep manual and operational QA documentation under `docs/quality-assurance/`.
