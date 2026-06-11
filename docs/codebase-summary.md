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
  app/                  Next.js pages, layouts, route handlers
  components/           Shared UI and layout components
  features/             Feature/use-case layer: UI, model, API helpers, actions, services
  generated/prisma/     Generated Prisma client
  i18n/                 next-intl routing/request helpers
  lib/                  Backend/domain/runtime modules and shared contracts
  proxy.ts              Clerk + next-intl middleware boundary

prisma/
  schema.prisma         Data model source of truth
  migrations/           SQL migrations
  data/dictionary/      Dictionary seed/import inputs
  seed.ts               Dictionary seed entrypoint
```

## Runtime Surfaces

| Surface | Files | Notes |
|---------|-------|-------|
| Locale pages | `src/app/[locale]/**/page.tsx` | Dashboard, auth, upload, reading, study, dictionary, progress, test. |
| Route handlers | `src/app/api/**/route.ts` | JSON/streaming APIs. Authenticated routes call `getAuthenticatedUser`. |
| Server actions | `src/features/study/actions/*.ts`, `src/features/upload/analyze-content-action.ts` | Feature UI mutation entrypoints. They authenticate, call feature services for feature-specific work, and delegate shared domain work to `src/lib/<domain>`. |
| Feature services | `src/features/<feature>/services/**` | Single-feature use-case workflows. |
| Domain services | `src/lib/<domain>/services/**` or existing `src/lib/<domain>/**` service files | Reusable business workflows, provider orchestration, DTO assembly, and persistence coordination behind routes/actions. |
| Repositories | `src/lib/<domain>/repositories/**`, `src/lib/dictionary/**/repository.ts`, legacy `src/lib/db/*-queries.ts` | Prisma/raw SQL data access. |

## Source Boundary Rules

| Area | Use for | Examples |
|------|---------|----------|
| `src/app` | Framework routing boundary. | `src/app/api/study-questions/route.ts`, locale pages, layouts. |
| `src/features` | Feature/use-case layer. | Study workspace UI/hooks/actions, upload use-case services, dictionary page UI, vocabulary UI. |
| `src/lib` | Reusable domain implementation layer. | `src/lib/dictionary`, `src/lib/study`, `src/lib/passages`, `src/lib/translation`, `src/lib/db`, `src/lib/auth`. |
| `src/components` | Shared presentation primitives. | `src/components/ui/button.tsx`, layout controls. |

Placement rule: if code is React UI, browser state, a feature-specific action wrapper, or a service used by only one feature/use case, keep it in `src/features`. If client-side data access is more than a trivial one-off call, put it in a feature hook or client API helper instead of the component body. If code is reused by more than one feature, touches repository/database access, performs reusable domain work, or defines a stable shared API contract, put it in `src/lib/<domain>`.

Feature folder convention:

```text
src/features/<feature>
+-- ui        React components and page sections
+-- model     feature types, hooks, state machines, pure utilities
+-- api       client-side API wrappers and fetch helpers
+-- actions   server actions invoked by feature UI
+-- services  single-feature use-case services
```

## Feature Cross-reference

| Feature | UI | Client API / hooks | Routes | Domain / service | DB tables | Tests | Detail docs |
|---|---|---|---|---|---|---|---|
| Upload | Upload and processing pages; `src/features/upload/ui` | `src/features/upload/hooks` | `src/app/api/upload` | Upload workflow; content analysis; validation; storage | `passages`, `file_upload_intents` | API, component, service, validation | [Upload API](API/Routes/upload-feature.md), [Upload flow](Flows/upload-flow.md), [Upload UI](Architecture/frontend-ui-architecture/upload-page.md), [Processing UI](Architecture/frontend-ui-architecture/processing-page.md) |
| Study workspace | Study page; `src/features/study/ui` | Study hooks and model | `src/app/api/study-session` | Study actions; passage study service; passage queries | `passages`, `study_sessions` | Component, service, hook/model | [Study API](API/Routes/study-session-feature.md), [Study flow](Flows/study-flow.md), [Study UI](Architecture/frontend-ui-architecture/study-page.md) |
| Study chat | Study chat panel | Chat panel client state; study response schemas | `src/app/api/study-chat` | Chat service; AI model config | `study_chat_messages`, `passages`, `profiles` | API, component | [Study chat API](API/Routes/study-chat-feature.md), [Study chat flow](Flows/study-chat-flow.md) |
| Study questions | Study quiz UI | Study API client; question generation action | `src/app/api/study-questions` | Question generator; study response schemas | `questions`, `passages` | API, action | [Study questions API](API/Routes/study-questions-feature.md), [Study flow](Flows/study-flow.md) |
| Quiz attempt | Study quiz UI | Quiz attempt client | `src/app/api/quiz-attempt` | Quiz attempt and session queries | `quiz_attempts`, `study_sessions` | API | [Quiz attempt API](API/Routes/quiz-attempt-feature.md), [Study flow](Flows/study-flow.md) |
| Study results | Study studio and content panels | Study hooks and result model | `src/app/api/study-results` | Study results service; passage queries | `passages`, `questions` | Component, service | [Study results API](API/Routes/study-results-feature.md), [Study flow](Flows/study-flow.md), [Study UI](Architecture/frontend-ui-architecture/study-page.md) |
| Translation | Study translate popup and content panel | Selection model; translation schemas | `src/app/api/translate` | Translation service; AI translator; translation queries | `translation_caches`, `translation_histories`, `passages` | API, component, performance | [Translation API](API/Routes/translation-feature.md), [Translation flow](Flows/translation-flow.md), [Study UI](Architecture/frontend-ui-architecture/study-page.md) |
| Dictionary | Dictionary page; `src/features/dictionary/ui` | `src/features/dictionary/hooks` | `src/app/api/dictionary` | Dictionary lookup, search, suggest, and entry services | `dictionary_entries`, `dictionary_senses`, `dictionary_translations`, `dictionary_aliases`, `dictionary_source_audits` | API, component, service | [Dictionary API](API/Routes/dictionary-feature.md), [Dictionary flow](Flows/dictionary-flow.md), [Dictionary UI](Architecture/frontend-ui-architecture/dictionary-page.md) |
| Vocabulary | Vocabulary page; dictionary save UI | Vocabulary hooks/model; dictionary save hook | `src/app/api/vocabulary` | Vocabulary service; vocabulary and set queries | `vocabulary_items`, `vocabulary_occurrences`, `vocabulary_sets`, `vocabulary_set_items` | API | [Vocabulary API](API/Routes/vocabulary-feature.md), [Vocabulary flow](Flows/vocabulary-flow.md), [Vocabulary UI](Architecture/frontend-ui-architecture/vocabulary-page.md) |
| Cards / review | Study quiz UI; progress dashboard | Study API client | `src/app/api/cards` | Card review queries; SM-2 algorithm | `questions`, `card_reviews` | API, query, algorithm | [Cards API](API/Routes/cards-feature.md), [Spaced repetition flow](Flows/spaced-repetition-flow.md) |
| Progress / session | Progress page and dashboard | Progress dashboard client | `src/app/api/progress`, `src/app/api/study-session` | Progress/session queries | `study_sessions`, `quiz_attempts`, `card_reviews` | API, component, query | [Progress API](API/Routes/progress-feature.md), [Study session API](API/Routes/study-session-feature.md), [Progress UI](Architecture/frontend-ui-architecture/progress-page.md) |
| Auth | Clerk auth pages; layout auth controls | Auth helpers; `src/proxy.ts` | Clerk auth pages | Auth sync and ownership helpers | `profiles` | Auth helper, smoke | [Auth architecture](Architecture/auth-architecture.md), [Auth flow](Flows/auth-flow.md), [Auth UI](Architecture/frontend-ui-architecture/auth-pages.md) |

## API Inventory

See [API/api-index.md](API/api-index.md). Implemented production feature routes include upload, translate, dictionary, vocabulary, cards, progress, study session, study chat, health, and local development blob access.

## Known Gaps

- Processing is still a transition UI, not a durable background-job status system.
- Production readiness depends on environment separation for Clerk, Neon, Blob, Sentry, and Vercel.
- OCR, YouTube transcription, billing, and native mobile are not in the current product scope.
- Some docs in `docs/Design/` and `docs/Sentry/` are supplemental and not part of the primary docs tree.

**Status:** Active
**Last Updated:** 2026-06-11
