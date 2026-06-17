# Traceability Matrix

**English Reading Training App**

Joins user stories → use cases → API routes → test scenarios → covering test files.
Every API route from [../API/api-index.md](../API/api-index.md) appears below. A row whose
covering test cell is **GAP** has no real automated test and must not be claimed as covered.

## Feature Routes

| US | UC | API route | TS | Covering test file |
|----|----|-----------|----|--------------------|
| US-01 | UC-01 | `POST /api/upload/text` | TS-01, TS-02, TS-03 | `tests/vitest/integration/api/upload-routes.test.ts` |
| US-02 | UC-01 | `POST /api/upload` | TS-04 | `tests/vitest/integration/api/upload-routes.test.ts` |
| US-10 | UC-09 | `POST /api/translate` | TS-14, TS-15 | `tests/vitest/integration/api/translation-vocabulary-routes.test.ts` |
| US-04 | UC-03 | `POST /api/studio-questions` | TS-22 | `tests/vitest/integration/api/studio-questions-route.test.ts` |
| US-09 | UC-08 | `GET /api/studio-artifacts` | TS-13 | `src/server/modules/study/passage/studio-artifacts-service.test.ts` |
| US-14 | UC-12 | `GET/POST /api/study-chat` | TS-21 | `tests/vitest/integration/api/study-chat-route.test.ts` |
| US-13 | UC-11 | `GET /api/dictionary/lookup` | TS-19, TS-20 | `tests/vitest/integration/api/dictionary-lookup-route.test.ts` |
| US-13 | UC-11 | `GET /api/dictionary/search` | TS-19, TS-20 | `tests/vitest/integration/api/dictionary-search-route.test.ts` |
| US-13 | UC-11 | `GET /api/dictionary/suggest` | TS-19, TS-20 | `tests/vitest/integration/api/dictionary-suggest-route.test.ts` |
| US-13 | UC-11 | `GET /api/dictionary/entries/[entryId]` | TS-19, TS-20 | `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts` |
| US-11 | UC-10 | `POST /api/vocabulary` | TS-16 | `tests/vitest/integration/api/vocabulary-save-route.test.ts` |
| US-11 | UC-10 | `GET /api/vocabulary/list` | TS-16 | `tests/vitest/integration/api/vocabulary-list-route.test.ts` |
| US-12 | UC-10 | `PATCH /api/vocabulary/[id]/status` | TS-18 | `tests/vitest/integration/api/vocabulary-status-and-delete-routes.test.ts` |
| US-12 | UC-10 | `DELETE /api/vocabulary/[id]` | TS-18 | `tests/vitest/integration/api/vocabulary-status-and-delete-routes.test.ts` |
| US-12 | UC-10 | `GET /api/vocabulary/sets` | TS-17 | `tests/vitest/integration/api/vocabulary-set-list-create-routes.test.ts` |
| US-12 | UC-10 | `POST /api/vocabulary/sets` | TS-17 | `tests/vitest/integration/api/vocabulary-set-list-create-routes.test.ts` |
| US-12 | UC-10 | `PATCH/DELETE /api/vocabulary/sets/[id]` | TS-17 | `tests/vitest/integration/api/vocabulary-set-update-delete-routes.test.ts` |
| US-12 | UC-10 | `POST /api/vocabulary/sets/[id]/items` | TS-17 | `tests/vitest/integration/api/vocabulary-set-item-routes.test.ts` |
| US-12 | UC-10 | `DELETE /api/vocabulary/sets/[id]/items/[itemId]` | TS-17 | `tests/vitest/integration/api/vocabulary-set-item-routes.test.ts` |
| US-08 | UC-07 | `GET /api/progress/stats` | TS-12 | `tests/vitest/integration/components/progress/progress-dashboard.integration.test.tsx` |
| US-05 | UC-04 | `POST /api/study-session` | TS-09 | `tests/vitest/integration/api/study-session-route.test.ts` |

## Utility Routes

| Purpose | API route | Covering test file |
|---------|-----------|--------------------|
| Health check | `GET /api/health` | `tests/vitest/integration/api/health-and-env-contract.test.ts` |
| Dev-only local file serving | `GET /api/local-blob/[pathname]` | **GAP** |
| Dictionary benchmark fixtures | `POST /api/test/dictionary-performance-fixtures` | **GAP** (driven by `tests/performance/` runner, no unit assertion) |
| Translation benchmark fixtures | `POST /api/test/translate-performance-fixtures` | **GAP** (driven by `tests/performance/` runner, no unit assertion) |
| Sentry smoke test | `GET /api/sentry-example-api` | **GAP** |

## Gaps Summary

- `GET /api/local-blob/[pathname]` — dev-only; no automated test.
- `POST /api/test/dictionary-performance-fixtures`, `POST /api/test/translate-performance-fixtures`
  — exercised indirectly by the performance runner under `tests/performance/`, no Vitest assertion.
- `GET /api/sentry-example-api` — Sentry smoke route; no automated test.
- Sign-out flow (TS-11) — no automated coverage.

Every feature route maps to at least one user story, use case, and test scenario with a real
covering file. Gaps above are genuine test debt, not invented coverage.
