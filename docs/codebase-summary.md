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

## Key Feature Modules

| Feature | Primary files |
|---------|---------------|
| Upload | `src/features/upload/*`, `src/app/api/upload/*` |
| Study workspace | `src/features/study/ui/*`, `src/features/study/model/*`, `src/features/study/api/*`, `src/lib/study/*`, `src/app/[locale]/(dashboard)/study/page.tsx` |
| Quiz attempts | `src/lib/db/quiz-attempt-queries.ts`, `src/app/api/quiz-attempt/route.ts` |
| Translation | `src/lib/translation/*`, `src/app/api/translate/route.ts` |
| Dictionary | `src/lib/dictionary/*`, `src/app/api/dictionary/*` |
| Study chat | `src/app/api/study-chat/route.ts`, `src/features/study/ui/studio/chat/chat-panel.tsx` |
| Cards/progress | `src/lib/db/card-review-queries.ts`, `src/app/api/cards/*`, `src/app/api/progress/stats/route.ts` |
| Auth | `src/proxy.ts`, `src/lib/auth/*`, Clerk pages under `(auth)` |

## API Inventory

See [API/api-index.md](API/api-index.md). Implemented production feature routes include upload, translate, dictionary, vocabulary, cards, progress, study session, study chat, health, and local development blob access.

## Known Gaps

- Processing is still a transition UI, not a durable background-job status system.
- Production readiness depends on environment separation for Clerk, Neon, Blob, Sentry, and Vercel.
- OCR, YouTube transcription, billing, and native mobile are not in the current product scope.
- Some docs in `docs/Design/` and `docs/sentry/` are supplemental and not part of the primary docs tree.

**Status:** Active
**Last Updated:** 2026-06-11
