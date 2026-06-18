# API Index

Routes are organized by **domain** — each domain maps to a server bounded context
in `src/server/modules/` (plus a read-only Progress domain and non-domain utility
routes). See the [canonical domain taxonomy](Api-doc-convention.md#canonical-domain-taxonomy).

## Conventions

- Implementation convention: [api-implementation-conventions.md](api-implementation-conventions.md)
- Documentation convention: [Api-doc-convention.md](Api-doc-convention.md)
- Architecture: [../Architecture/api-architecture.md](../Architecture/api-architecture.md)

## Domains

### Upload

| Method | Path | Doc |
|--------|------|-----|
| `POST` | `/api/upload` | [upload.md](Routes/upload.md) |
| `POST` | `/api/upload/text` | [upload.md](Routes/upload.md) |

### Study

The largest domain — see the [Study domain index](Routes/study/README.md).

| Method | Path | Doc |
|--------|------|-----|
| `POST` | `/api/study/passages` | [passages.md](Routes/study/passages.md) |
| `DELETE` | `/api/study/passages/[id]` | [passages.md](Routes/study/passages.md) |
| `POST` | `/api/study/passages/[id]/simplify` | [passages.md](Routes/study/passages.md) |
| `POST` | `/api/study/sessions` | [sessions.md](Routes/study/sessions.md) |
| `POST`/`GET` | `/api/study/studio/chat` | [studio/chat.md](Routes/study/studio/chat.md) |
| `GET` | `/api/study/studio/artifacts` | [studio/artifacts.md](Routes/study/studio/artifacts.md) |
| `GET` | `/api/study/studio/artifacts/[id]` | [studio/artifacts.md](Routes/study/studio/artifacts.md) |
| `POST`/`DELETE` | `/api/study/studio/artifacts/[id]/quiz-result` | [studio/artifacts.md](Routes/study/studio/artifacts.md) |
| `POST` | `/api/study/studio/questions` | [studio/questions.md](Routes/study/studio/questions.md) |

### Translation

| Method | Path | Doc |
|--------|------|-----|
| `POST` | `/api/translate` | [translation.md](Routes/translation.md) |

### Dictionary

| Method | Path | Doc |
|--------|------|-----|
| `GET` | `/api/dictionary/lookup` | [dictionary.md](Routes/dictionary.md) |
| `GET` | `/api/dictionary/search` | [dictionary.md](Routes/dictionary.md) |
| `GET` | `/api/dictionary/suggest` | [dictionary.md](Routes/dictionary.md) |
| `GET` | `/api/dictionary/entries/[entryId]` | [dictionary.md](Routes/dictionary.md) |

### Vocabulary

Includes the spaced-repetition review surface. See [vocabulary.md](Routes/vocabulary.md).

| Method | Path | Doc |
|--------|------|-----|
| `POST` | `/api/vocabulary` | [vocabulary.md](Routes/vocabulary.md) |
| `GET` | `/api/vocabulary/list` | [vocabulary.md](Routes/vocabulary.md) |
| `PATCH` | `/api/vocabulary/[id]/status` | [vocabulary.md](Routes/vocabulary.md) |
| `POST` | `/api/vocabulary/[id]/review` | [vocabulary.md](Routes/vocabulary.md) |
| `DELETE` | `/api/vocabulary/[id]` | [vocabulary.md](Routes/vocabulary.md) |
| `GET`/`POST` | `/api/vocabulary/sets` | [vocabulary.md](Routes/vocabulary.md) |
| `PATCH`/`DELETE` | `/api/vocabulary/sets/[id]` | [vocabulary.md](Routes/vocabulary.md) |
| `POST` | `/api/vocabulary/sets/[id]/items` | [vocabulary.md](Routes/vocabulary.md) |
| `DELETE` | `/api/vocabulary/sets/[id]/items/[itemId]` | [vocabulary.md](Routes/vocabulary.md) |

### Progress

Read-only reporting domain. See [progress.md](Routes/progress.md).

| Method | Path | Doc |
|--------|------|-----|
| `GET` | `/api/progress/stats` | [progress.md](Routes/progress.md) |

## Utility Routes

Non-domain infrastructure / development routes.

| Route | Purpose |
|-------|---------|
| `GET /api/health` | Health check. |
| `POST /api/webhooks/clerk` | Clerk webhook receiver (public). Verifies signature with `CLERK_WEBHOOK_SIGNING_SECRET` and syncs `user.created` / `user.updated` / `user.deleted` events to `UserProfile`. |
| `GET /api/local-blob/[pathname]` | Development-only local file serving. |
| `POST /api/test/dictionary-performance-fixtures` | Test fixture route for dictionary benchmarks. |
| `POST /api/test/translate-performance-fixtures` | Test fixture route for translation benchmarks. |
| `GET /api/sentry-example-api` | Sentry smoke-test route. |
