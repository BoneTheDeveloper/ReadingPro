# System Architecture

## Overview

```text
Browser
  Next.js client components, Clerk UI/session, study workspace
    |
    v
Next.js App Router
  Server Components, server actions, route handlers, proxy middleware
    |
    +-- Clerk: identity, sessions, OAuth
    +-- Neon Postgres: app data, dictionary, progress
    +-- Prisma 7: typed DB client and migrations
    +-- Vercel Blob: private preview/production file storage
    +-- Local blob adapter: development file storage
    +-- AI SDK providers: simplification, questions, study chat
    +-- Sentry + Pino: errors, spans, logs, performance diagnostics
```

The application is a server-first Next.js product. User-facing pages are locale-prefixed, authenticated dashboard routes. Mutations are implemented with route handlers and server actions that call feature services and repository modules.

## Main Boundaries

| Boundary | Owner | Notes |
|----------|-------|-------|
| Routing/auth middleware | `src/proxy.ts` | Clerk route protection plus next-intl locale routing. |
| User identity | Clerk + `UserProfile` | Clerk owns login; app DB owns profile row and data relationships. |
| Product features | `src/features/*` | UI, hooks, workflows, server actions. |
| Shared services | `src/lib/*` | Auth, DB, storage, AI, dictionary, translation, observability. |
| Data model | `prisma/schema.prisma` | Source of truth for tables and relationships. |
| API | `src/app/api/**/route.ts` | HTTP/streaming contracts. |

## Data Ownership

`UserProfile.id` equals the Clerk user id. User-owned tables store `userId` and must be filtered by it:

- `Passage`
- `StudySession`
- `CardReview`
- `StudyChatMessage`
- `TranslationCache`
- `TranslationHistory`
- `VocabularyItem`
- `FileUploadIntent`

Dictionary tables are shared read data and are not user-owned.

## Core Workflows

- Upload: file/text input -> validation -> storage/PDF parse -> content analysis -> passage/questions.
- Study: server-loaded passages -> three-panel workspace -> simplify/questions/chat/translation actions.
- Translation: selection -> owned passage check -> cache/dictionary/provider -> cache/history/vocabulary.
- Dictionary: normalized query -> repository SQL/Prisma -> DTO.
- Review: generated questions -> card reviews -> SM-2 scheduling -> progress stats.

## Architecture Docs

- Runtime: [runtime-architecture.md](runtime-architecture.md)
- Frontend UI: [frontend-ui-architecture](frontend-ui-architecture/README.md)
- Auth: [auth-architecture.md](auth-architecture.md)
- Database: [database-architecture.md](database-architecture.md)
- Storage: [storage-architecture.md](storage-architecture.md)
- API: [api-architecture.md](api-architecture.md)
- Observability: [observability-architecture.md](observability-architecture.md)
- Deployment: [deployment-architecture.md](deployment-architecture.md)
