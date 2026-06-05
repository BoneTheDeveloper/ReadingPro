# Response Contract Coverage

Last updated: 2026-06-05.

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
| `POST /api/study-session` | JSON contracted | `studySessionResponseSchema` |
| `PATCH /api/study-session` | JSON contracted | `studySessionResponseSchema` |
| `POST /api/upload` | JSON contracted | `uploadResponseSchema` |
| `POST /api/upload/text` | JSON contracted | `uploadResponseSchema` |
| `GET /api/study-chat` | JSON contracted history payload | `studyChatHistoryResponseSchema` |
| `POST /api/study-chat` | Streaming exception | request schema plus JSON error envelope |

Non-product or diagnostic routes such as `/api/health`, `/api/local-blob`,
`/api/sentry-example-api`, and test fixture endpoints are outside the product
JSON response migration scope.
