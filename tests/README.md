# Test Strategy

The repository uses `tests/` for Vitest suites, Vitest config, performance benchmarks, shared fixtures, and runner-agnostic test helpers.

## Test Types

| Type | Tool | Location | Naming | Purpose |
| --- | --- | --- | --- | --- |
| Unit | Vitest | `src/**` (co-located) | `*.test.ts` | Pure logic for a single source module — placed next to the file it tests. |
| Component | Vitest + React Testing Library | `tests/vitest/integration/components/` | `*.integration.test.tsx` | User-facing component behavior with framework and service boundaries mocked. |
| Integration | Vitest | `tests/vitest/integration/` | `*.integration.test.ts` | Multiple app modules together with live providers and database mocked. |
| Smoke | Vitest | `tests/vitest/smoke/` | `*.test.tsx` | Minimal proof that the Vitest stack and app entrypoints are wired. |
| Performance | Custom TS runner | `tests/performance/` | `*-benchmark.ts` | Real app server and database with query and timing budgets. |

## Folders

- `tests/vitest/` contains Vitest config, component, integration, smoke, mock, helper, fixture, and setup files.
- `tests/performance/` contains API benchmark runners and benchmark helpers.
- `tests/shared/` contains runner-agnostic helpers used by more than one suite.
- `tests/fixtures/` contains shared file fixtures used by manual, E2E, and integration workflows.
