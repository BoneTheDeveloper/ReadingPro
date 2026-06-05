# Codebase Summary

**English Reading Training App**

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.6 App Router, React Server Components |
| UI | React 19.2.6, shadcn/ui, Tailwind CSS 4, Lucide React |
| i18n | next-intl with locale-prefixed routes (`/en/*`, `/vi/*`) |
| Theming | next-themes with class-based dark mode |
| Auth | Clerk (`@clerk/nextjs`) |
| Database | Neon PostgreSQL + Prisma ORM v7.8 (`@prisma/adapter-pg`) |
| Storage | Local filesystem in development, Vercel Blob in preview/production |
| AI | Vercel AI SDK v6 + OpenAI/Google providers |
| PDF | `pdf-parse` v2.4.5 |
| Validation | Zod v4 |
| Monitoring | Sentry, Vercel Speed Insights |
| Logging | Pino structured logging |
| Tests | Vitest, Testing Library, Playwright |

## Source Layout

The codebase separates route surfaces from feature implementation:

- `src/app/` contains App Router layouts, locale routes, auth pages, and API routes.
- `src/features/` contains feature-specific UI, hooks, server actions, and workflows.
- `src/components/ui/` contains reusable shadcn-style primitives.
- `src/components/layout/` contains dashboard chrome, theme/language controls, and auth controls.
- `src/lib/` contains auth, database, storage, AI, dictionary, translation, validation, and observability infrastructure.
- `src/generated/prisma/` contains the generated Prisma client.
- `localization/` contains message catalogs and i18n reference docs.
- `prisma/` contains schema, migrations, seed data, and migration workflow notes.

```text
src/
├── app/
│   ├── api/
│   │   ├── cards/{due,review}/route.ts
│   │   ├── dictionary/{lookup,search,suggest}/route.ts
│   │   ├── local-blob/[pathname]/route.ts
│   │   ├── progress/stats/route.ts
│   │   ├── study-chat/route.ts
│   │   ├── study-session/route.ts
│   │   ├── translate/route.ts
│   │   ├── upload/{route,text/route}.ts
│   │   └── vocabulary/route.ts
│   ├── [locale]/
│   │   ├── (auth)/sign-in/[[...sign-in]]/page.tsx
│   │   ├── (auth)/sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/{study,upload,progress,dictionary}/page.tsx
│   │   ├── (dashboard)/reading/[id]/page.tsx
│   │   ├── (dashboard)/test/[id]/page.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
├── features/
├── generated/prisma/
├── i18n/
├── lib/
└── proxy.ts
```

## Core Modules

| Area | Files | Responsibility |
|------|-------|----------------|
| Route protection | `src/proxy.ts` | Runs Clerk middleware, applies auth redirects, then delegates localized requests to next-intl. |
| Auth profile sync | `src/lib/auth/auth-utils.ts`, `src/lib/auth/sync-user.ts` | Reads Clerk session/user metadata and upserts `UserProfile`. |
| Database client | `src/lib/db/client.ts`, `src/lib/db/create-prisma-client.ts` | Creates Prisma client with Postgres adapter and query instrumentation. |
| Upload workflow | `src/features/upload/upload-workflow.ts` | Validates file/text, stores file, extracts PDF text, runs analysis. |
| Storage adapter | `src/lib/storage/blob-storage.ts` | Uses `.local-blob-storage/` in development and private Vercel Blob in preview/production. |
| Study workspace | `src/features/study/*` | Three-panel reading, quiz, translation, chat, and upload experience. |
| Translation | `src/lib/translation/*`, `src/app/api/translate/route.ts` | Quick/detailed translation, cache/history, vocabulary saving. |
| Dictionary | `src/lib/dictionary/*`, `src/app/api/dictionary/*` | Lookup, suggest, search, and entry detail services. |
| Observability | `src/lib/core/*`, `src/instrumentation*.ts` | Pino logging, Sentry instrumentation, metrics helpers. |

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Redirects into the default locale flow. |
| `/[locale]` | Locale-prefixed dashboard home. |
| `/[locale]/sign-in` | Clerk sign-in page. |
| `/[locale]/sign-up` | Clerk sign-up page. |
| `/[locale]/upload` | Upload or paste content. |
| `/[locale]/processing` | Processing transition UI. |
| `/[locale]/reading/[id]` | Reading view for a saved passage. |
| `/[locale]/test/[id]` | Flashcard test for a passage. |
| `/[locale]/study` | Three-panel study workspace. |
| `/[locale]/dictionary` | Dictionary lookup/search. |
| `/[locale]/progress` | Progress dashboard. |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | Canonical app URL for redirects and absolute links. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public Clerk browser key. |
| `CLERK_SECRET_KEY` | Server-side Clerk API key. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Clerk webhook verification secret. |
| `DATABASE_URL` | Neon pooled runtime Postgres connection. |
| `DIRECT_URL` | Neon direct Postgres connection for migrations only. |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for preview/production file storage. |
| `OPENAI_API_KEY` | OpenAI API key for AI features. |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional Sentry browser DSN. |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | CI-only source-map upload settings. |
| `CRON_SECRET` | Secret for scheduled cleanup endpoints. |

## Known Gaps

- Processing page still uses a transition/progress UI rather than live job progress.
- Production deployment depends on correctly separated Clerk development/production instances, Neon branches, and Blob stores.
- Some AI and translation flows have caching, but not every generated artifact is cached.
- Some UI strings remain hard-coded in English; see `localization/docs/architecture.md`.

**See also:**
- Data models -> [`docs/database/data-dictionary.md`](database/data-dictionary.md)
- API endpoints and requirements -> [`docs/database/srs.md`](database/srs.md)
- ERD -> [`docs/database/erd.md`](database/erd.md)

**Status:** Active
**Last Updated:** 2026-06-05
