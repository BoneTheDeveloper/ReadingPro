# Response Contract Coverage

Last updated: 2026-06-06.

Frontend-consumed product JSON routes use shared Zod response schemas for
browser parsing and/or route contract tests. Raw Prisma records are not stable
API DTOs unless they are mapped into the documented response schema first.

| Route | Classification | Shared schema |
| --- | --- | --- |
| `POST /api/translate` | JSON contracted, optional performance branch | `translateResponseSchema` |
| `POST /api/vocabulary` | JSON contracted | `vocabularyResponseSchema` |
| `GET /api/dictionary/lookup` | JSON contracted, optional performance branch | `dictionaryLookupResponseSchema` |
| `GET /api/dictionary/search` | JSON contracted, optional performance branch | `dictionarySearchResponseSchema` |
| `GET /api/dictionary/suggest` | JSON contracted, optional performance branch | `dictionarySuggestResponseSchema` |
| `GET /api/dictionary/entries/:entryId` | JSON contracted, optional performance branch | `dictionaryEntryDetailResponseSchema` |
| `GET /api/cards/due` | JSON contracted | `dueCardsResponseSchema` |
| `POST /api/cards/review` | JSON contracted | `cardReviewResponseSchema` |
| `GET /api/progress/stats` | JSON contracted | `progressStatsResponseSchema` |
| `POST /api/study/studio/questions` | JSON contracted | `generatedStudyQuestionsResponseSchema` |
| `POST /api/study/sessions` | JSON contracted | `studySessionResponseSchema` |
| `GET /api/study/studio/artifacts` | JSON, inline response (no named schema) | request: `studyArtifactsQuerySchema` (query) |
| `GET /api/study-results` | JSON contracted | (inline Zod query schema, StudioResult type) |
| `POST /api/upload` | JSON contracted | `uploadResponseSchema` |
| `POST /api/upload/text` | JSON contracted | `uploadResponseSchema` |
| `GET /api/study/studio/chat` | JSON contracted history payload | `studyChatHistoryResponseSchema` |
| `POST /api/study/studio/chat` | Streaming exception | request schema plus JSON error envelope |

Non-product or diagnostic routes such as `/api/health`, `/api/local-blob`,
`/api/sentry-example-api`, and test fixture endpoints are outside the product
JSON response migration scope.

## Phase 2 Contract Test Map

The MVP-hardening API contract suite covers the priority route set from
`docs/Testing/contract-tests.md` with success envelopes, validation failures,
auth failures, owned-resource misses where applicable, and stable `{ error }`
payloads.

| Area | Contract test files |
| --- | --- |
| Upload | `tests/vitest/integration/api/upload-routes.test.ts`, `tests/vitest/integration/api/routes.test.ts` |
| Translation and vocabulary | `tests/vitest/integration/api/translation-vocabulary-routes.test.ts` |
| Dictionary | `tests/vitest/integration/api/dictionary-lookup-route.test.ts`, `tests/vitest/integration/api/dictionary-search-route.test.ts`, `tests/vitest/integration/api/dictionary-suggest-route.test.ts`, `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts` |
| Studio questions | `tests/vitest/integration/api/studio-questions-route.test.ts` |
| Quiz attempt | `tests/vitest/integration/api/routes.test.ts` |
| Study results | no dedicated test file yet |
| Study chat | `tests/vitest/integration/api/study-chat-route.test.ts`, `tests/vitest/integration/api/routes.test.ts` |
| Cards and progress | `tests/vitest/integration/api/cards-progress-routes.test.ts`, `tests/vitest/integration/api/routes.test.ts` |
| Study session | `tests/vitest/integration/api/study-session-route.test.ts`, `tests/vitest/integration/api/routes.test.ts` |
