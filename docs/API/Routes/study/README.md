# Study Domain API

The **Study** bounded context (`src/server/modules/study`) is the largest API
domain. Routes are nested under `/api/study/*` to match the bounded context, and
split into two groups:

- **Workspace** routes (`/api/study/*`) — passage content and session lifecycle.
- **Studio** routes (`/api/study/studio/*`) — everything driven by the Study page's
  Studio panel (chat, quiz). See [studio/](studio/).

## Workspace

| Sub-resource | Doc | Routes |
|---|---|---|
| Passages | [passages.md](passages.md) | `POST /api/study/passages`, `DELETE /api/study/passages/[id]`, `POST /api/study/passages/[id]/simplify` |
| Sessions | [sessions.md](sessions.md) | `POST /api/study/sessions` |

## Studio panel

Routes originating from `StudyStudioPanel` (`src/features/study/ui/studio`).

| Sub-resource | Doc | Routes |
|---|---|---|
| Chat | [studio/chat.md](studio/chat.md) | `POST /api/study/studio/chat`, `GET /api/study/studio/chat` |
| Questions | [studio/questions.md](studio/questions.md) | `POST /api/study/studio/questions` |
| Artifacts | [studio/artifacts.md](studio/artifacts.md) | `GET /api/study/studio/artifacts`, `GET /api/study/studio/artifacts/[id]`, `POST/DELETE /api/study/studio/artifacts/[id]/quiz-result` |

All Study routes require an authenticated user and operate only on resources the
user owns.
