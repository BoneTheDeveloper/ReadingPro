# Project Changelog

**English Reading Training App**

---

## [Unreleased]

### Planned
- YouTube transcription (Whisper API)
- Scanned PDF OCR support
- Advanced analytics dashboard
- Authentication (NextAuth.js v5)

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
- `next.config.ts` — Source maps upload configuration via `withSentryConfig()`:
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
  - `LOG_LEVEL` env var (default: `debug` dev, `info` prod)

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
