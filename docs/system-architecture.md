# System Architecture

**English Reading Training App**

## High-Level Architecture

```text
Browser
  React 19 + Next.js App Router + Tailwind CSS + shadcn/ui
  Clerk client UI, next-intl navigation, study workspace
    |
    v
Next.js Server
  src/proxy.ts: Clerk middleware + next-intl routing
  Server Components, Server Actions, Route Handlers
    |
    +--> Clerk                 auth sessions, user profile metadata
    +--> Neon PostgreSQL       Prisma ORM, app data, dictionary, progress
    +--> Vercel Blob           private preview/production uploads
    +--> Local filesystem      development uploads in .local-blob-storage/
    +--> OpenAI/Google AI      CEFR, simplification, questions, chat
    +--> Sentry/Pino           errors, spans, structured logs
```

## Request And Auth Flow

```text
User-facing request
  -> src/proxy.ts
  -> skip API, Next internals, monitoring, favicon, Clerk internals
  -> Clerk middleware reads session
  -> unauthenticated protected route: redirect to /{locale}/sign-in?redirect_url={url}
  -> authenticated auth page: redirect to /{locale}
  -> next-intl middleware handles locale routing
  -> route/page renders
```

Server-side user access is centralized in `src/lib/auth/auth-utils.ts`:

```text
requireAuth()
  -> Clerk auth()
  -> clerkClient().users.getUser(userId)
  -> syncUser(clerk id, email, name, avatar)
  -> return UserProfile
```

`UserProfile.id` is the Clerk user id. App-owned entities use Postgres UUIDs.

## Data Flow: Content Upload And Analysis

```text
User uploads PDF/TXT or pastes text
  -> /api/upload or /api/upload/text
  -> Zod/file validation
  -> PDF text extraction with pdf-parse when needed
  -> upload file through storage adapter
       local: .local-blob-storage/
       preview/production: private Vercel Blob
  -> analyzeAndPersistContent()
       CEFR heuristic + AI analysis
       simplification
       question generation
  -> Prisma persists Passage, Question, and filePath
  -> UI navigates to reading/study experience
```

`Passage.filePath` stores the storage pathname, not a provider-specific public URL. Local file reads are served through `/api/local-blob/[pathname]`; Vercel Blob access is resolved by `src/lib/storage/blob-storage.ts`.

## Data Flow: Study, Translation, And Chat

```text
Study workspace
  -> server actions load user passages and selected passage
  -> content panel renders original/simplified passage
  -> studio panel runs quiz, translation, and chat actions
  -> /api/translate uses dictionary/cache/history services
  -> /api/vocabulary saves selected vocabulary
  -> /api/study-chat streams tutor responses and persists messages
```

Dictionary lookups use normalized headwords, aliases, senses, and translations in Neon through Prisma repositories. Quick translation is cache-first and uses query-budget performance tests.

## Data Flow: Flashcard Test And SM-2

```text
User opens /{locale}/test/[id]
  -> Server Component fetches passage and questions
  -> Flashcard client tracks answers, streak, score
  -> POST /api/cards/review
  -> card-review queries calculate SM-2 interval
  -> Prisma upserts CardReview by [questionId, userId]
```

## Data Flow: Progress Review

```text
Progress dashboard
  -> GET /api/progress/stats
  -> due-card stats from CardReview
  -> POST /api/study-session creates a session
  -> review loop updates CardReview records
  -> PATCH /api/study-session completes counters and accuracy
```

## Module Dependency Map

```text
src/proxy.ts
├── @clerk/nextjs/server
├── next-intl/middleware
└── src/i18n/routing.ts

src/lib/auth/auth-utils.ts
├── @clerk/nextjs/server
├── src/lib/auth/sync-user.ts
└── src/lib/db/client.ts

src/features/upload/upload-workflow.ts
├── src/lib/validation/upload.ts
├── src/lib/parsers/pdf.ts
├── src/lib/storage/blob-storage.ts
└── src/features/upload/content-analysis-service.ts

src/features/upload/content-analysis-service.ts
├── src/lib/ai/content-simplifier.ts
├── src/lib/ai/question-generator.ts
├── src/lib/domain/cefr.ts
└── src/lib/db/passage-queries.ts

src/app/api/translate/route.ts
├── src/lib/translation/inline/*
├── src/lib/db/translation-queries.ts
└── src/lib/dictionary/*

src/app/api/study-chat/route.ts
├── ai SDK streaming
├── src/lib/auth/auth-utils.ts
└── src/lib/db/study-session-queries.ts
```

## Database Layer

```text
Prisma Client
  -> @prisma/adapter-pg
  -> Neon pooled DATABASE_URL at runtime
  -> Neon direct DIRECT_URL for migrations
  -> generated client in src/generated/prisma

Domain query modules
  -> passage-queries.ts
  -> card-review-queries.ts
  -> study-session-queries.ts
  -> translation-queries.ts
  -> dictionary repositories/services
```

Migration rules:

- Runtime app code uses `DATABASE_URL`.
- Prisma migration jobs use `DIRECT_URL` only in local or trusted CI contexts.
- Neon API credentials are CI-only and never injected into application runtime.
- Migrations must remain plain PostgreSQL; `scripts/database/assert-plain-postgres-migrations.ts` rejects provider-specific SQL.

## Storage Layer

```text
uploadFile(filename, buffer, contentType)
  -> development: write .local-blob-storage/{pathname}
  -> preview/production: put private object in Vercel Blob
  -> return { pathname, url }

deleteFile(pathname)
  -> local unlink or Vercel Blob delete

getSignedUrl(pathname)
  -> local /api/local-blob route or Vercel Blob URL
```

Vercel environments should use separate Blob tokens for preview and production.

## Rendering Strategy

| Page | Type | Data fetching |
|------|------|---------------|
| `/[locale]/sign-in`, `/[locale]/sign-up` | Clerk UI page | Clerk client/server integration |
| `/[locale]` | Server Component | Authenticated dashboard data |
| `/[locale]/upload` | Client Component | Upload workflow calls API/actions |
| `/[locale]/reading/[id]` | Server -> Client | Server fetches passage |
| `/[locale]/test/[id]` | Server -> Client | Server fetches passage and questions |
| `/[locale]/study` | Server -> Client | Dynamic study workspace data |
| `/[locale]/progress` | Server -> Client | Progress stats |
| `/[locale]/dictionary` | Client Component | Dictionary APIs |

**See also:**
- Data models and schema -> [`docs/database/data-dictionary.md`](database/data-dictionary.md)
- ERD -> [`docs/database/erd.md`](database/erd.md)
- API endpoints and requirements -> [`docs/database/srs.md`](database/srs.md)
- Neon environment contract -> [`docs/database/neon-environment-contract.md`](database/neon-environment-contract.md)

**Status:** Active
**Last Updated:** 2026-06-05
