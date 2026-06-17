# Study Domain API

The **Study** bounded context (`src/server/modules/study`) is the largest API
domain. All its routes are nested under `/api/study/*` to match the bounded
context; they are documented here grouped by sub-resource.

| Sub-resource | Doc | Routes |
|---|---|---|
| Passages | [passages.md](passages.md) | `POST /api/study/passages`, `DELETE /api/study/passages/[id]`, `POST /api/study/passages/[id]/simplify` |
| Chat | [chat.md](chat.md) | `POST /api/study/chat`, `GET /api/study/chat` |
| Sessions | [sessions.md](sessions.md) | `POST /api/study/sessions` |
| Artifacts | [artifacts.md](artifacts.md) | `GET /api/study/artifacts`, `GET /api/study/artifacts/[id]`, `POST/DELETE /api/study/artifacts/[id]/quiz-result` |
| Questions | [questions.md](questions.md) | `POST /api/study/questions` |

All Study routes require an authenticated user and operate only on resources the
user owns.
