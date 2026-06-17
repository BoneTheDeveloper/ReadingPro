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
  shared/               Contract layer (isomorphic/pure): Zod schemas, DTOs, pure utils
  features/             Frontend feature layer (FSD-lite): ui, hooks, model, api
  components/           Universal design system primitives (UI atoms)
  generated/            Generated code (e.g. Prisma client)
  i18n/                 next-intl routing/request helpers
  proxy.ts              Clerk + next-intl middleware boundary

prisma/
  schema/               Modular Prisma schemas
  migrations/           SQL migrations
  data/dictionary/      Dictionary seed/import inputs
  seed.ts               Dictionary seed entrypoint
```

## Runtime Surfaces

| Surface | Files | Notes |
|---------|-------|-------|
| Locale pages | `src/app/[locale]/**/page.tsx` | Thin UI entrypoints. They fetch data via Server Components or render Client Features. |
| Route handlers | `src/app/api/**/route.ts` | Thin HTTP adapters. They authenticate, validate inputs via `shared/`, and delegate to `server/modules`. |
| Server Modules | `src/server/modules/<domain>/**` | Core business logic services. Used by API routes and Server Components. |
| Feature Components | `src/features/<feature>/ui/**` | Rich frontend features. They use `hooks` for state/fetching and `api` for backend communication. |
| Feature API | `src/features/<feature>/api/**` | Centralized frontend API clients. The only way frontend features talk to `/api/*`. |

## Source Boundary Rules

| Area | Use for | Examples |
|------|---------|----------|
| `src/app` | Routing and delivery. | `src/app/api/study-session/route.ts`, locale pages. |
| `src/server` | All backend-only logic. | `src/server/db/client.ts`, `src/server/modules/study`, `src/server/ai`. |
| `src/shared` | Isomorphic contracts. | `src/shared/study/study-response-schema.ts`, `src/shared/api/api-client-utils.ts`. |
| `src/features` | Frontend feature logic. | `src/features/study/ui`, `src/features/dictionary/hooks`. |
| `src/components` | Shared UI atoms. | `src/components/ui/button.tsx`. |
```

## Feature Cross-reference

| Feature | UI | Client API / hooks | Routes | Domain / service | DB tables | Tests | Detail docs |
|---|---|---|---|---|---|---|---|
| Upload | Upload and processing pages; `src/features/upload/ui` | `src/features/upload/hooks` | `src/app/api/upload` | Upload workflow; content analysis; validation; storage | `passages`, `file_upload_intents` | API, component, service, validation | [Upload API](API/Routes/upload-feature.md), [Upload flow](Flows/upload-flow.md), [Upload UI](Architecture/frontend-ui-architecture/upload-page.md), [Processing UI](Architecture/frontend-ui-architecture/processing-page.md) |
| Study workspace | Study page; `src/features/study/ui` | Study hooks and model | `src/app/api/study-session` | Study actions; passage study service; passage queries; session heartbeat | `passages`, `study_sessions` | Component, service, hook/model | [Study API](API/Routes/study-session-feature.md), [Study flow](Flows/study-flow.md), [Study UI](Architecture/frontend-ui-architecture/study-page.md) |
| Study chat | Study chat panel | Chat panel client state; study response schemas | `src/app/api/study-chat` | Chat service; AI model config | `study_chat_messages`, `passages`, `profiles` | API, component | [Study chat API](API/Routes/study-chat-feature.md), [Study chat flow](Flows/study-chat-flow.md) |
| Studio artifacts | Study studio and quiz UI | Study API client; studio actions | `src/app/api/studio-artifacts`, `src/app/api/studio-questions` | Artifacts service; question generator | `studio_artifacts`, `questions`, `quiz_results`, `passages` | API, action, component | [Studio artifacts API](API/Routes/studio-artifacts-feature.md), [Studio questions API](API/Routes/studio-questions-feature.md) |
| Translation | Study translate popup and content panel | Selection model; translation schemas | `src/app/api/translate` | Translation service; AI translator; translation queries | `translation_caches`, `translation_histories`, `passages` | API, component, performance | [Translation API](API/Routes/translation-feature.md), [Translation flow](Flows/translation-flow.md), [Study UI](Architecture/frontend-ui-architecture/study-page.md) |
| Dictionary | Dictionary page; `src/features/dictionary/ui` | `src/features/dictionary/hooks` | `src/app/api/dictionary` | Dictionary lookup, search, suggest, and entry services | `dictionary_entries`, `dictionary_senses`, `dictionary_translations`, `dictionary_aliases`, `dictionary_source_audits` | API, component, service | [Dictionary API](API/Routes/dictionary-feature.md), [Dictionary flow](Flows/dictionary-flow.md), [Dictionary UI](Architecture/frontend-ui-architecture/dictionary-page.md) |
| Vocabulary | Vocabulary page; dictionary save UI | Vocabulary hooks/model; dictionary save hook | `src/app/api/vocabulary` | Vocabulary service; vocabulary and set queries; `scheduler.ts` | `vocabulary_items`, `vocabulary_occurrences`, `vocabulary_sets`, `vocabulary_set_items` | API | [Vocabulary API](API/Routes/vocabulary-feature.md), [Vocabulary flow](Flows/vocabulary-flow.md), [Vocabulary UI](Architecture/frontend-ui-architecture/vocabulary-page.md) |
| Progress / session | Progress page and dashboard | Progress dashboard client | `src/app/api/progress/stats`, `src/app/api/study-session` | Progress/session queries | `study_sessions` | API, component, query | [Progress API](API/Routes/progress-feature.md), [Study session API](API/Routes/study-session-feature.md), [Progress UI](Architecture/frontend-ui-architecture/progress-page.md) |
| Auth | Clerk auth pages; layout auth controls | Auth helpers; `src/proxy.ts` | Clerk auth pages | Auth sync and ownership helpers | `profiles` | Auth helper, smoke | [Auth architecture](Architecture/auth-architecture.md), [Auth flow](Flows/auth-flow.md), [Auth UI](Architecture/frontend-ui-architecture/auth-pages.md) |

## API Inventory

See [API/api-index.md](API/api-index.md). Implemented production feature routes include upload, translate, dictionary, vocabulary, cards, progress, study session, study chat, health, and local development blob access.

**Status:** Active
**Last Updated:** 2026-06-11
