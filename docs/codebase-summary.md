# Codebase Summary

## Stack

| Layer | Current choice |
|-------|----------------|
| Framework | Next.js 16.2 App Router, React 19, RSC |
| UI | Tailwind CSS 4, shadcn-style primitives, Lucide icons |
| Auth | Clerk for session and identity, app `UserProfile` for ownership |
| Database | Neon Postgres, Prisma 7 generated into `src/generated/prisma` |
| Storage | Local filesystem in development, private Vercel Blob in preview/production |
| AI | Vercel AI SDK, OpenAI and Google provider packages |
| Validation | Zod at API/server-action boundaries |
| Observability | Sentry, Pino, optional Prisma/query performance headers |
| Tests | Vitest, Testing Library, Playwright, performance benchmark scripts |

## Source Layout

```text
src/
  app/                  Next.js routing layer: thin pages + thin API route handlers (HTTP adapters)
  server/               Backend layer (enforced server-only): db, ai, auth, http, modules
  contracts/            Contract layer (isomorphic/pure): Zod schemas, DTOs, pure utils
  features/             Frontend feature layer (FSD-lite): ui, hooks, model, api
  ui/                   Universal design system: primitives (UI atoms) + layout
  generated/            Generated code (Prisma client)
  i18n/                 next-intl routing/request helpers
  proxy.ts              Clerk + next-intl middleware boundary
```

## Feature Cross-reference

Folder-level locator for each feature. Cells stay coarse (folders, not files) so they drift
less; follow the detail docs to go deeper. In DB tables, `prefix_*` denotes a whole table
family — see [`../prisma/schema/`](../prisma/schema/) for exact tables and columns.

| Feature | Frontend (ui / hooks) | Routes | Domain / service | DB tables | Detail docs |
|---|---|---|---|---|---|
| Upload | `src/features/upload` | `src/app/api/upload` | Upload workflow; content analysis; validation; storage | `passages`, `file_upload_intents` | [Upload API](API/Routes/upload.md), [Upload flow](Flows/data-flows/upload-flow.md), [Upload UI](Architecture/frontend-ui-architecture/pages/upload-page.md), [Processing UI](Architecture/frontend-ui-architecture/pages/processing-page.md) |
| Study workspace | `src/features/study` (ui, hooks, model) | `src/app/api/study/sessions` | Study actions; passage study service; passage queries; session heartbeat | `passages`, `study_sessions` | [Study sessions API](API/Routes/study/sessions.md), [Study passages API](API/Routes/study/passages.md), [Study flow](Flows/data-flows/study-flow.md), [Study UI](Architecture/frontend-ui-architecture/pages/study-page.md) |
| Study chat | `src/features/study/ui` (chat panel) | `src/app/api/study/studio/chat` | Chat service; AI model config | `study_chat_messages`, `passages`, `profiles` | [Study chat API](API/Routes/study/chat.md), [Study chat flow](Flows/data-flows/study-chat-flow.md) |
| Studio artifacts | `src/features/study` (studio, quiz) | `src/app/api/study/studio/artifacts`, `.../questions` | Artifacts service; question generator | `studio_artifacts`, `questions`, `quiz_results`, `passages` | [Study artifacts API](API/Routes/study/artifacts.md), [Study questions API](API/Routes/study/questions.md) |
| Translation | `src/features/study` (translate popup, content panel) | `src/app/api/translate` | Translation service; AI translator; translation queries | `translation_*`, `passages` | [Translation API](API/Routes/translation.md), [Translation flow](Flows/data-flows/translation-flow.md), [Study UI](Architecture/frontend-ui-architecture/pages/study-page.md) |
| Dictionary | `src/features/dictionary` | `src/app/api/dictionary` | Dictionary lookup, search, suggest, and entry services | `dictionary_*` | [Dictionary API](API/Routes/dictionary.md), [Dictionary flow](Flows/data-flows/dictionary-flow.md), [Dictionary UI](Architecture/frontend-ui-architecture/pages/dictionary-page.md) |
| Vocabulary | `src/features/vocabulary` (+ dictionary save UI) | `src/app/api/vocabulary` | Vocabulary service; vocabulary and set queries; `scheduler.ts` | `vocabulary_*` | [Vocabulary API](API/Routes/vocabulary.md), [Vocabulary flow](Flows/data-flows/vocabulary-flow.md), [Vocabulary UI](Architecture/frontend-ui-architecture/pages/vocabulary-page.md) |
| Progress / session | `src/features/progress` | `src/app/api/progress/stats`, `src/app/api/study/sessions` | Progress/session queries | `study_sessions` | [Progress API](API/Routes/progress.md), [Study sessions API](API/Routes/study/sessions.md), [Progress UI](Architecture/frontend-ui-architecture/pages/progress-page.md) |
| Auth | Clerk auth pages; layout auth controls | Clerk-hosted auth pages | Auth sync and ownership helpers; `src/proxy.ts` | `profiles` | [Auth architecture](Architecture/auth-architecture.md), [Auth flow](Flows/data-flows/auth-flow.md), [Auth UI](Architecture/frontend-ui-architecture/pages/auth-pages.md) |

## API Inventory

The route inventory lives in [API/api-index.md](API/api-index.md). Per-feature routes are
listed alongside their UI, services, and tables in the Feature Cross-reference above.

**Status:** Active
**Last Updated:** 2026-06-20
