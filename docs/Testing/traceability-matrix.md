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
| US-01 | UC-01 | `POST /api/study/passages` | — | **GAP** (no HTTP-level integration test; DB logic: `src/server/db/passage-queries.test.ts`) |
| US-06 | UC-02 | `POST /api/study/passages/[id]/simplify` | TS-24a, TS-24b | `tests/vitest/integration/services/passage-study-service.test.ts` (logic only; route = GAP) |
| US-09 | UC-08 | `DELETE /api/study/passages/[id]` | — | **GAP** (no HTTP-level integration test; DB logic: `src/server/db/passage-queries.test.ts`) |
| US-12 | UC-09 | `POST /api/translate` | TS-14, TS-15 | `tests/vitest/integration/api/translation-vocabulary-routes.test.ts` |
| US-07 | UC-03 | `POST /api/study/studio/questions` | TS-22 | `tests/vitest/integration/api/studio-questions-route.test.ts` |
| US-09 | UC-08 | `GET /api/study/studio/artifacts` | TS-13 | `src/server/modules/study/passage/studio-artifacts-service.test.ts` (logic only; route = GAP) |
| US-09 | UC-08 | `GET /api/study/studio/artifacts/[id]` | — | **GAP** (no HTTP-level integration test; service logic: `src/server/modules/study/passage/studio-artifacts-service.test.ts`) |
| US-07 | UC-03 | `POST /api/study/studio/artifacts/[id]/quiz-result` | TS-25 | `src/server/modules/study/passage/studio-artifacts-service.test.ts` (logic only; route = GAP) |
| US-10 | UC-12 | `GET /api/study/studio/chat` | TS-21 | `tests/vitest/integration/api/study-chat-route.test.ts` |
| US-10 | UC-12 | `POST /api/study/studio/chat` | TS-21 | `tests/vitest/integration/api/study-chat-route.test.ts` |
| US-14 | UC-11 | `GET /api/dictionary/lookup` | TS-19, TS-20 | `tests/vitest/integration/api/dictionary-lookup-route.test.ts` |
| US-14 | UC-11 | `GET /api/dictionary/search` | TS-19, TS-20 | `tests/vitest/integration/api/dictionary-search-route.test.ts` |
| US-14 | UC-11 | `GET /api/dictionary/suggest` | TS-19, TS-20 | `tests/vitest/integration/api/dictionary-suggest-route.test.ts` |
| US-14 | UC-11 | `GET /api/dictionary/entries/[entryId]` | TS-19, TS-20 | `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts` |
| US-15 | UC-10 | `POST /api/vocabulary` | TS-16 | `tests/vitest/integration/api/vocabulary-save-route.test.ts` |
| US-15 | UC-10 | `GET /api/vocabulary/list` | TS-16 | `tests/vitest/integration/api/vocabulary-list-route.test.ts` |
| US-15 | UC-10 | `PATCH /api/vocabulary/[id]/status` | TS-18 | `tests/vitest/integration/api/vocabulary-status-and-delete-routes.test.ts` |
| US-15 | UC-10 | `DELETE /api/vocabulary/[id]` | TS-18 | `tests/vitest/integration/api/vocabulary-status-and-delete-routes.test.ts` |
| US-19 | UC-04 | `POST /api/vocabulary/[id]/review` | TS-08, TS-26 | `src/server/modules/spaced-repetition/scheduler.test.ts` (logic only; route = GAP) |
| US-16 | UC-10 | `GET /api/vocabulary/sets` | TS-17 | `tests/vitest/integration/api/vocabulary-set-list-create-routes.test.ts` |
| US-16 | UC-10 | `POST /api/vocabulary/sets` | TS-17 | `tests/vitest/integration/api/vocabulary-set-list-create-routes.test.ts` |
| US-16 | UC-10 | `PATCH /api/vocabulary/sets/[id]` | TS-17 | `tests/vitest/integration/api/vocabulary-set-update-delete-routes.test.ts` |
| US-16 | UC-10 | `DELETE /api/vocabulary/sets/[id]` | TS-17 | `tests/vitest/integration/api/vocabulary-set-update-delete-routes.test.ts` |
| US-16 | UC-10 | `POST /api/vocabulary/sets/[id]/items` | TS-17 | `tests/vitest/integration/api/vocabulary-set-item-routes.test.ts` |
| US-16 | UC-10 | `DELETE /api/vocabulary/sets/[id]/items/[itemId]` | TS-17 | `tests/vitest/integration/api/vocabulary-set-item-routes.test.ts` |
| US-22 | UC-07 | `GET /api/progress/stats` | TS-12 | `tests/vitest/integration/api/routes.test.ts` |
| US-18 | UC-04 | `POST /api/study/sessions` | TS-09 | `tests/vitest/integration/api/study-session-route.test.ts` |

## Utility Routes

| Purpose | API route | Covering test file |
|---------|-----------|--------------------|
| Health check | `GET /api/health` | `tests/vitest/integration/api/health-and-env-contract.test.ts` |
| Clerk identity sync (webhook) | `POST /api/webhooks/clerk` | `src/app/api/webhooks/clerk/route.test.ts` |
| Dev-only local file serving | `GET /api/local-blob/[pathname]` | **GAP** |
| Dictionary benchmark fixtures | `POST /api/test/dictionary-performance-fixtures` | **GAP** (driven by `tests/performance/` runner, no unit assertion) |
| Translation benchmark fixtures | `POST /api/test/translate-performance-fixtures` | **GAP** (driven by `tests/performance/` runner, no unit assertion) |
| Sentry smoke test | `GET /api/sentry-example-api` | **GAP** |

## Gaps Summary

- `POST /api/vocabulary/[id]/review` — scheduler logic covered; HTTP route has no integration test (TS-26).
- `POST /api/study/passages` — passage creation route has no HTTP-level integration test.
- `DELETE /api/study/passages/[id]` — passage delete route has no HTTP-level integration test.
- `POST /api/study/passages/[id]/simplify` — simplification service logic covered; HTTP route has no integration test (TS-24).
- `GET /api/study/studio/artifacts` — service logic covered; HTTP route auth and failure envelope not explicitly asserted.
- `GET /api/study/studio/artifacts/[id]` — route serves per-artifact question data; no HTTP-level integration test.
- `POST /api/study/studio/artifacts/[id]/quiz-result` — quiz-result service logic covered; HTTP route has no integration test (TS-25).
- `GET /api/local-blob/[pathname]` — dev-only; no automated test.
- `POST /api/test/dictionary-performance-fixtures`, `POST /api/test/translate-performance-fixtures` — exercised indirectly by the performance runner under `tests/performance/`, no Vitest assertion.
- `GET /api/sentry-example-api` — Sentry smoke route; no automated test.
- Sign-out flow (TS-11) — no automated coverage.

Every feature route maps to at least one user story, use case, and test scenario with a real covering file or an explicit GAP; gaps above are genuine test debt, not invented coverage.
