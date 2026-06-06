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
  features/             Product feature UI, hooks, actions, workflows
  generated/prisma/     Generated Prisma client
  i18n/                 next-intl routing/request helpers
  lib/                  Auth, DB, storage, AI, dictionary, translation, observability
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
| Server actions | `src/features/study/actions/*.ts`, `src/features/upload/analyze-content-action.ts` | Mutations colocated with feature modules. |
| Services | `src/lib/**`, `src/features/**/services` | Business logic and data access behind routes/actions. |
| Repositories | `src/lib/dictionary/**/repository.ts`, `src/lib/db/*-queries.ts` | Prisma/raw SQL data access. |

## Key Feature Modules

| Feature | Primary files |
|---------|---------------|
| Upload | `src/features/upload/*`, `src/app/api/upload/*` |
| Study workspace | `src/features/study/*`, `src/app/[locale]/(dashboard)/study/page.tsx` |
| Translation | `src/lib/translation/*`, `src/app/api/translate/route.ts` |
| Dictionary | `src/lib/dictionary/*`, `src/app/api/dictionary/*` |
| Study chat | `src/app/api/study-chat/route.ts`, `src/features/study/study-chat-panel.tsx` |
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
**Last Updated:** 2026-06-06
