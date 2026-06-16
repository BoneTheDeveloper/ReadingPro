# API Index

## Conventions

- Implementation convention: [api-implementation-conventions.md](api-implementation-conventions.md)
- Documentation convention: [Api-doc-convention.md](Api-doc-convention.md)
- Architecture: [../Architecture/api-architecture.md](../Architecture/api-architecture.md)

## Feature Routes

| Feature | Routes | Doc |
|---------|--------|-----|
| Upload | `POST /api/upload`, `POST /api/upload/text` | [Routes/upload-feature.md](Routes/upload-feature.md) |
| Translation | `POST /api/translate` | [Routes/translation-feature.md](Routes/translation-feature.md) |
| Study questions | `POST /api/study-questions` | [Routes/study-questions-feature.md](Routes/study-questions-feature.md) |
| Study artifacts | `GET /api/study-artifacts` | [Routes/study-artifacts-feature.md](Routes/study-artifacts-feature.md) |
| Study chat | `GET/POST /api/study-chat` | [Routes/study-chat-feature.md](Routes/study-chat-feature.md) |
| Quiz attempt | `POST /api/quiz-attempt`, `PATCH /api/quiz-attempt` | [Routes/quiz-attempt-feature.md](Routes/quiz-attempt-feature.md) |
| Study results | `GET /api/study-results` | [Routes/study-results-feature.md](Routes/study-results-feature.md) |
| Dictionary | `GET /api/dictionary/lookup`, `search`, `suggest`, `entries/[entryId]` | [Routes/dictionary-feature.md](Routes/dictionary-feature.md) |
| Vocabulary | `POST /api/vocabulary`, `GET /api/vocabulary/list`, `PATCH /api/vocabulary/[id]/status`, `DELETE /api/vocabulary/[id]`, `GET /api/vocabulary/sets`, `POST /api/vocabulary/sets`, `PATCH/DELETE /api/vocabulary/sets/[id]`, `POST /api/vocabulary/sets/[id]/items`, `DELETE /api/vocabulary/sets/[id]/items/[itemId]` | [Routes/vocabulary-feature.md](Routes/vocabulary-feature.md) |
| Cards | `GET /api/cards/due`, `POST /api/cards/review` | [Routes/cards-feature.md](Routes/cards-feature.md) |
| Progress/session | `GET /api/progress/stats`, `POST /api/study-session` | [Routes/progress-feature.md](Routes/progress-feature.md) |

## Utility Routes

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Health check. |
| `GET /api/local-blob/[pathname]` | Development-only local file serving. |
| `POST /api/test/dictionary-performance-fixtures` | Test fixture route for dictionary benchmarks. |
| `POST /api/test/translate-performance-fixtures` | Test fixture route for translation benchmarks. |
| `GET /api/sentry-example-api` | Sentry smoke-test route. |
