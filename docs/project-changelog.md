# Project Changelog

**English Reading Training App**

---

## [Unreleased]

### Added
- Clerk auth integration for sign-in/sign-up, Google OAuth, route protection, and profile sync.
- Neon PostgreSQL environment contract for local, preview, and production database branches.
- Vercel Blob storage adapter for private preview/production uploads with local filesystem storage in development.
- Vitest test infrastructure with React Testing Library, jest-dom, jsdom, v8 coverage, shared mocks, fixtures, helpers, and smoke tests.
- GitHub Actions CI workflow for lint, TypeScript, tests, coverage, and gated Playwright E2E.
- `docs/quality-assurance/vitest.md` documenting test commands and the shared test scaffold.
- Playwright authenticated setup with reusable `.auth/user.json`, public/authenticated project split, and generated screenshot output under `test-results/playwright/screenshots/`.
- `playwright/README.md` documenting local `.env.test`, pre-created test users, screenshot commands, and CI secrets.

### Changed
- Replaced the previous auth, hosted Postgres, and object storage design with Clerk + Neon + Vercel Blob.
- Optimized `/api/translate` quick dictionary path from 7 Prisma queries to ≤4 blocking queries.
- Replaced 3-query sequential dictionary lookup (`findEntryByHeadword` + `findEntryByAlias`) with single `$queryRaw` using LEFT JOINs on entries, aliases, senses, and translations.
- Reordered translate route to cache-first: `cacheRead` before `sourceFetch`, skipping source ownership check on cache hit.
- Made `historyCreate` non-blocking (fire-and-forget with Sentry error logging).
- Moved performance benchmarks under `tests/performance` and added dictionary-flow benchmark coverage for suggest/search/lookup phases.
- Updated `docs/API/Routes/translation-feature.md` with new flow order, non-blocking history, and performance budget table.
- Extracted study simplification/question-generation orchestration into `src/lib/study/passage/passage-study.service.ts`.
- Split `StudyPageClient` state, async actions, and panel layout mechanics into focused hooks.
- Moved CEFR domain helpers to `lib/domain/cefr.ts` and CEFR presentation classes to `lib/ui/cefr-style.ts`.
- Reused the canonical `lib/algorithms/sm2.ts` implementation from card review queries.
- Updated study-session API route to delegate to `lib/db/study-session-queries.ts`.

### Planned
- YouTube transcription (Whisper API)
- Scanned PDF OCR support
- Advanced analytics dashboard
- Verify production Vercel environment variables and scheduled cleanup behavior

---
## [2026-05-07] — Phase 05-06: Auth UI Updates & Testing

### Added
- `src/components/ui/dropdown-menu.tsx` — shadcn/ui dropdown menu for user menu
- `src/components/user-menu.tsx` — UserMenu component with real user name/email display and avatar
- `src/hooks/use-sign-out.ts` — `useSignOut` shared hook for sign-out functionality
- `src/components/sign-out-button.tsx` — SignOutButton component for sidebar sign-out
- User dropdown menu in desktop sidebar with real user data display
- Mobile menu support with dropdown and sign-out button
- Test coverage for auth-related components and utilities

### Changed
- Phase 05 status updated to **Completed** — UserMenu and sign-out functionality implemented
- Phase 06 status updated to **Completed** — Build, lint, and TypeScript compilation pass
- Demo user references remain in server actions/routes (Phase 02-04 scope)

---

## [2026-05-07] — Legacy Authentication Implementation

### Added
- Legacy auth client packages and middleware utilities
- `lib/auth/sync-user.ts` — upserts local user profile rows from external auth identity
- `(auth)/layout.tsx` — centered card layout with ReadingPro branding
- `(auth)/sign-in/page.tsx` — email/password + Google OAuth sign-in (Suspense-wrapped)
- `(auth)/sign-up/page.tsx` — email/password/confirm + Google OAuth sign-up
- Legacy OAuth callback route with user sync and redirect
- Middleware session handling, route protection, and redirect preservation
- OAuth setup documentation for local, Vercel preview, and production

### Changed
- `prisma/schema.prisma` — added an external auth id column to the user model
- Unauthenticated users redirected to `/sign-in` for all protected routes
- Auth pages (`/sign-in`, `/sign-up`) accessible without authentication

---

## [2026-05-06] — AI Provider Switch & Study Page Refactor

### Added
- `@ai-sdk/openai` integration with `openai('gpt-4o-mini')` model replacing Google Gemini
- `api/sentry-example-api/route.ts` — Sentry test endpoint
- Enhanced study page with three-panel resizable workspace (sources, content, studio)
- `lib/db/client.ts` — centralized Prisma client singleton
- `lib/core/logger.ts` — Pino structured logging with module-based loggers
- `lib/core/sentry.ts` — Sentry client configuration with PII stripping
- Removed duplicate `api/upload/text-route.ts` (only `api/upload/text/route.ts` remains)

### Changed
- All AI modules (`cefr-detector.ts`, `content-simplifier.ts`, `question-generator.ts`) switched from Google Gemini to OpenAI gpt-4o-mini
- Study page elevated to primary workspace with modal upload, quiz, and results sections
- DB client moved from `lib/db.ts` to `lib/db/client.ts`
- File structure reorganized: `lib/db/utils.ts`, `lib/algorithms/sm2.ts`, `lib/parsers/pdf.ts`, `lib/validation/upload.ts`, `lib/shared/*`
- Dashboard layout now includes navigation sidebar

---

## [2026-05-06] — Study Page Right Panel Refactor

### Added
- Enhanced right panel with unified results section for quiz and study outcomes
- Improved item type handling for consistent display across different result types
- Better visual feedback for study session outcomes and quiz results

### Changed
- Refactored `study-right-panel.tsx` to consolidate quiz and results rendering
- Standardized data structures for consistent result display
- Improved user experience with clearer result presentation

---

## [2026-05-01] — Phase 04: Sentry Source Maps Upload

### Added
- `next.config.ts` — Source maps upload configuration:
  - `authToken: process.env.SENTRY_AUTH_TOKEN` for CI-based source maps upload
  - `org` and `project` now use environment variables with fallbacks (`process.env.SENTRY_ORG || "pham-dac-luc"`, `process.env.SENTRY_PROJECT || "javascript-nextjs"`)
  - `widenClientFileUpload: true` for more complete source maps coverage
  - `tunnelRoute: "/monitoring"` to bypass ad-blockers
  - `silent: !process.env.CI` to only log in CI environment
  - `webpack.treeshake.removeDebugLogging: true` for bundle size optimization
  - `webpack.automaticVercelMonitors: true` for Vercel Cron Monitors auto-instrumentation
- `.env.example` — Added Sentry CI setup instructions:
  - `SENTRY_AUTH_TOKEN` — Generate at https://sentry.io/settings/account/api/auth-tokens/
  - `SENTRY_ORG` — Your Sentry organization slug
  - `SENTRY_PROJECT` — Your Sentry project slug
  - `CI=true` — Enables upload (silent mode off)

### Changed
- Phase 4 status updated to **Completed** in project roadmap

---

## [2026-05-01] — Phase 03: Sentry Performance Monitoring

### Added
- `Sentry.pinoIntegration()` in `sentry.server.config.ts`:
  - Forwards Pino error/fatal logs as Sentry errors (handled: true)
  - Forwards Pino warn/error/fatal logs as Sentry log entries
- `Sentry.startSpan()` performance monitoring in:
  - `src/app/actions/analyze.ts`: `ai:cefr-detect`, `ai:content-simplify`, `ai:question-gen`, `db:user-lookup`, `db:passage-create`
  - `src/app/api/upload/route.ts`: `file-write`, `pdf-parse`
  - `src/app/api/study-session/route.ts`: `db:session-create`, `db:session-update`
  - `src/app/api/cards/review/route.ts`: `db:card-review-update`

### Changed
- Phase 3 status updated to **Completed** in project roadmap
- `sentry.server.config.ts` now merges `pinoIntegration` with existing Sentry config via `...(getSentryConfig())`

---

## [2026-04-28] — Phase 02: Sentry Error Tracking + Pino Logging

### Added
- `@sentry/nextjs` package for error tracking and performance monitoring
- `sentry.server.config.ts` with `isSentryEnabled()` guard
- `Sentry.withServerActionInstrumentation()` wrapping `analyzeContentAction` and `studyAnalyzeAction`
- `Sentry.captureException()` in all API route error handlers (`/upload`, `/study-session`, `/cards/review`)
- `Sentry.addBreadcrumb()` for tracing AI calls and DB operations
- `lib/core/logger.ts` — Pino-based structured logging:
  - Dev: pretty-printed via `pino-pretty`
  - Prod: JSON format with ISO timestamps
  - `createModuleLogger(module)` for per-module child loggers

### Changed
- All API routes and server actions now use `createModuleLogger()` instead of console.log
- Error responses remain user-friendly; full errors logged via `log.error({ err: error }, message)`

---

## [2026-04-27] — Phase 01: MVP Core Features

### Added
- Next.js 16.2.4 App Router with React 19.2.4
- Tailwind CSS 4 + shadcn/ui (base-nova theme)
- Text and PDF content upload (`/upload` page, `app/api/upload/route.ts`)
- PDF text extraction via `pdf-parse`
- CEFR level detection:
  - Primary: OpenAI gpt-4o-mini via Vercel AI SDK (`@ai-sdk/openai`)
  - Fallback: Heuristic (avg sentence length + complex word ratio)
- Content simplification to one CEFR level below original
- Comprehension question generation (5 MC/TF per passage with source citations)
- Flashcard test UI (`/test/[id]`) with multiple choice and true/false questions
- SM-2 spaced repetition algorithm (`lib/algorithms/sm2.ts`)
- SQLite database via Prisma ORM (`prisma/schema.prisma`):
  - User, Passage, Question, CardReview, StudySession models
- Progress dashboard (`/progress`) with stats and due cards
- Study session tracking (start/complete with cards reviewed, accuracy rate)
- `app/actions/analyze.ts` — orchestrator server action
- `lib/db/utils.ts` — centralized DB operations
- `lib/validation/upload.ts` — file validation (type, size 10MB, text length 50-100k)

### Fixed
- Question options parsing (JSON string → typed array) in flashcard test page
- Study session accuracy rate calculation

---

**Status:** Active  
**Last Updated:** 2026-05-06
