# Contract Tests

## Purpose

Contract tests protect stable API request/response shapes, especially routes consumed directly by client components. A cell is ✓ only if a real test asserts that exact behavior for that route. Cells that should be covered but are not are **GAP**. N/A means the check does not apply (e.g. no JSON body on a GET).

## Assertion Matrix

| Route | Valid → success shape | Invalid JSON → 400 | Schema violation → 400 | Missing auth → 401 | Missing owned resource → 404 | Failure → `{ error }` envelope |
|-------|-----------------------|--------------------|------------------------|--------------------|------------------------------|-------------------------------|
| `POST /api/upload/text` | ✓ | ✓ | ✓ | ✓ | N/A | ✓ |
| `POST /api/upload` | ✓ | N/A (multipart) | ✓ | ✓ | N/A | ✓ |
| `POST /api/translate` | ✓ | ✓ | ✓ | ✓ | GAP | ✓ |
| `POST /api/vocabulary` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /api/vocabulary/list` | ✓ | N/A | N/A | ✓ | N/A | ✓ |
| `PATCH /api/vocabulary/[id]/status` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `DELETE /api/vocabulary/[id]` | ✓ | N/A | N/A | ✓ | ✓ | ✓ |
| `POST /api/vocabulary/[id]/review` | GAP | GAP | GAP | GAP | GAP | GAP |
| `GET /api/vocabulary/sets` | ✓ | N/A | N/A | ✓ | N/A | ✓ |
| `POST /api/vocabulary/sets` | ✓ | ✓ | ✓ | ✓ | N/A | ✓ |
| `PATCH /api/vocabulary/sets/[id]` | ✓ | ✓ | GAP | ✓ | ✓ | GAP |
| `DELETE /api/vocabulary/sets/[id]` | ✓ | N/A | N/A | ✓ | ✓ | ✓ |
| `POST /api/vocabulary/sets/[id]/items` | ✓ | GAP | ✓ | ✓ | ✓ | GAP |
| `DELETE /api/vocabulary/sets/[id]/items/[itemId]` | ✓ | N/A | N/A | ✓ | ✓ | ✓ |
| `GET /api/dictionary/lookup` | ✓ | N/A | ✓ | ✓ | N/A | ✓ |
| `GET /api/dictionary/search` | ✓ | N/A | ✓ | ✓ | N/A | ✓ |
| `GET /api/dictionary/suggest` | ✓ | N/A | ✓ | ✓ | N/A | ✓ |
| `GET /api/dictionary/entries/[entryId]` | ✓ | N/A | ✓ | ✓ | ✓ | ✓ |
| `POST /api/study/sessions` | ✓ | ✓ | ✓ | ✓ | N/A | ✓ |
| `POST /api/study/studio/questions` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /api/study/studio/chat` | ✓ | N/A | ✓ | ✓ | ✓ | ✓ |
| `POST /api/study/studio/chat` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /api/study/studio/artifacts` | ✓ | N/A | N/A | GAP | N/A | GAP |
| `GET /api/study/studio/artifacts/[id]` | GAP | N/A | N/A | GAP | GAP | GAP |
| `POST /api/study/studio/artifacts/[id]/quiz-result` | GAP | GAP | GAP | GAP | GAP | GAP |
| `POST /api/study/passages` | GAP | GAP | GAP | GAP | N/A | GAP |
| `POST /api/study/passages/[id]/simplify` | GAP | N/A | N/A | GAP | GAP | GAP |
| `DELETE /api/study/passages/[id]` | GAP | N/A | N/A | GAP | GAP | GAP |
| `GET /api/progress/stats` | ✓ | N/A | N/A | GAP | N/A | ✓ |
| `POST /api/webhooks/clerk` | ✓ | N/A | ✓ | N/A (signature) | N/A | N/A |

## Gaps

- **`POST /api/vocabulary/[id]/review`** — no HTTP-level integration test; all columns are GAP. Scheduler logic is covered by `src/server/modules/spaced-repetition/scheduler.test.ts`.
- **`PATCH /api/vocabulary/sets/[id]`** — schema violation (400) and unexpected failure (500) cases not explicitly asserted.
- **`POST /api/vocabulary/sets/[id]/items`** — invalid JSON (400) and unexpected failure (500) cases not explicitly asserted.
- **`GET /api/study/studio/artifacts`** — auth (401) and failure envelope not explicitly asserted at the route level; service logic covered by `src/server/modules/study/passage/studio-artifacts-service.test.ts`.
- **`GET /api/study/studio/artifacts/[id]`** — no HTTP-level integration test; route serves per-artifact question data to the client.
- **`POST /api/study/studio/artifacts/[id]/quiz-result`** — no HTTP-level integration test; service logic covered by `src/server/modules/study/passage/studio-artifacts-service.test.ts`.
- **`POST /api/study/passages`** — no HTTP-level integration test; route creates passage records (used internally by upload flow).
- **`POST /api/study/passages/[id]/simplify`** — no HTTP-level integration test; service logic covered by `tests/vitest/integration/services/passage-study-service.test.ts`.
- **`DELETE /api/study/passages/[id]`** — no HTTP-level integration test; DB-level delete logic covered by `src/server/db/passage-queries.test.ts`.
- **`GET /api/progress/stats`** — 401 case not explicitly asserted.

## Implementation Notes

- Request validation source of truth: route-local Zod schemas in each `route.ts` file.
- Frontend-facing DTOs that need response-parsing or contract tests before safe refactoring: `POST /api/translate` response shape, `GET /api/study/studio/chat` history shape, `GET /api/dictionary/lookup` result shape.
- `POST /api/webhooks/clerk` uses Clerk signature verification rather than session-based auth; the "Missing auth → 401" column is N/A and "Schema violation → 400" covers invalid signatures.

## Covering Test Files

| Route group | File |
|-------------|------|
| Upload | `tests/vitest/integration/api/upload-routes.test.ts`, `tests/vitest/integration/api/routes.test.ts` |
| Translate | `tests/vitest/integration/api/translation-vocabulary-routes.test.ts` |
| Vocabulary (save, list, status, delete) | `tests/vitest/integration/api/vocabulary-save-route.test.ts`, `tests/vitest/integration/api/vocabulary-list-route.test.ts`, `tests/vitest/integration/api/vocabulary-status-and-delete-routes.test.ts` |
| Vocabulary (sets) | `tests/vitest/integration/api/vocabulary-set-list-create-routes.test.ts`, `tests/vitest/integration/api/vocabulary-set-update-delete-routes.test.ts`, `tests/vitest/integration/api/vocabulary-set-item-routes.test.ts` |
| Dictionary | `tests/vitest/integration/api/dictionary-lookup-route.test.ts`, `tests/vitest/integration/api/dictionary-search-route.test.ts`, `tests/vitest/integration/api/dictionary-suggest-route.test.ts`, `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts` |
| Study sessions | `tests/vitest/integration/api/study-session-route.test.ts`, `tests/vitest/integration/api/routes.test.ts` |
| Study chat | `tests/vitest/integration/api/study-chat-route.test.ts`, `tests/vitest/integration/api/routes.test.ts` |
| Studio questions | `tests/vitest/integration/api/studio-questions-route.test.ts` |
| Progress | `tests/vitest/integration/api/routes.test.ts` |
| Webhooks | `src/app/api/webhooks/clerk/route.test.ts` |
