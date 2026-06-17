# Contract Tests

## Purpose

Contract tests protect stable API request and response shapes, especially routes consumed directly by client components.

## Priority Routes

- `POST /api/upload/text`
- `POST /api/upload`
- `POST /api/translate`
- `POST /api/vocabulary`
- `GET /api/dictionary/lookup`
- `GET /api/dictionary/search`
- `GET /api/dictionary/suggest`
- `GET /api/dictionary/entries/[entryId]`
- `GET/POST /api/study/chat`
- `GET /api/cards/due`
- `POST /api/cards/review`
- `GET /api/progress/stats`

## Assertions

- Valid request returns documented success shape.
- Invalid JSON returns `400`.
- Schema violations return `400`.
- Missing auth returns `401`.
- Missing owned resource returns `404`.
- Unexpected failures return stable `{ error }` envelope.

## Implementation Notes

Use route-local schemas as the source for request validation expectations. For stable frontend-facing DTOs, add response parsing or backend contract tests before refactoring route data shapes.

## Current Coverage

Phase 2 MVP-hardening coverage lives in:

- `tests/vitest/integration/api/upload-routes.test.ts`
- `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`
- `tests/vitest/integration/api/dictionary-lookup-route.test.ts`
- `tests/vitest/integration/api/dictionary-search-route.test.ts`
- `tests/vitest/integration/api/dictionary-suggest-route.test.ts`
- `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts`
- `tests/vitest/integration/api/study-chat-route.test.ts`
- `tests/vitest/integration/api/cards-progress-routes.test.ts`
- `tests/vitest/integration/api/study-session-route.test.ts`
- `tests/vitest/integration/api/routes.test.ts`
