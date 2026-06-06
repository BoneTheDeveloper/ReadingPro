# API Index

## Conventions

- Implementation convention: [Api-impliment-conventions.md](Api-impliment-conventions.md)
- Documentation convention: [Api-doc-convention.md](Api-doc-convention.md)
- Architecture: [../Architecture/api-architecture.md](../Architecture/api-architecture.md)

## Feature Routes

| Feature | Routes | Doc |
|---------|--------|-----|
| Upload | `POST /api/upload`, `POST /api/upload/text` | [Routes/upload-feature.md](Routes/upload-feature.md) |
| Translation | `POST /api/translate` | [Routes/translation-feature.md](Routes/translation-feature.md) |
| Study chat | `GET/POST /api/study-chat` | [Routes/study-chat-feature.md](Routes/study-chat-feature.md) |
| Dictionary | `GET /api/dictionary/lookup`, `search`, `suggest`, `entries/[entryId]` | [Routes/dictionary-feature.md](Routes/dictionary-feature.md) |
| Vocabulary | `POST /api/vocabulary` | [Routes/vocabulary-feature.md](Routes/vocabulary-feature.md) |
| Cards | `GET /api/cards/due`, `POST /api/cards/review` | [Routes/cards-feature.md](Routes/cards-feature.md) |
| Progress/session | `GET /api/progress/stats`, `POST/PATCH /api/study-session` | [Routes/progress-feature.md](Routes/progress-feature.md) |

## Utility Routes

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Health check. |
| `GET /api/local-blob/[pathname]` | Development-only local file serving. |
| `POST /api/test/dictionary-performance-fixtures` | Test fixture route for dictionary benchmarks. |
| `POST /api/test/translate-performance-fixtures` | Test fixture route for translation benchmarks. |
| `GET /api/sentry-example-api` | Sentry smoke-test route. |
