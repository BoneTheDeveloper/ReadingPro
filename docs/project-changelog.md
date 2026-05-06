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

## [2026-05-06] — Resizable Study Panels

### Added
- `react-resizable-panels` v4 (12KB gzip, 0 deps) — draggable 10px gaps between study panels
- `study-page-client.tsx` — rewired with `Group`, `Panel`, `Separator` + `useDefaultLayout` hook for localStorage persistence
- SSR-safe localStorage accessor (`typeof window` check)
- `page.tsx` — `export const dynamic = 'force-dynamic'` to prevent SSR hydration crash
- Group `id="study-panels"` for debugging
- Separator `group` class for `group-data-*` hover/active state selectors

### Changed
- `study-left-panel.tsx` — removed `width: '220px'`, `shrink-0` → `h-full`
- `study-right-panel.tsx` — removed `width: '260px'` from all 3 render paths, `shrink-0` → `h-full`
- Panel size config: Left 22% (min 220px, max 70%), Center auto (min 220px), Right 26% (min 220px, max 70%)

---

## [2026-05-06] — Resizable Study Panels

### Added
- `react-resizable-panels@4.11.0` — draggable three-panel layout for `/study` page
- `src/app/(dashboard)/study/` — complete study workspace:
  - `page.tsx` — server entry with `export const dynamic = 'force-dynamic'`
  - `study-page-client.tsx` — `Group` + `Panel` + `Separator` from react-resizable-panels
  - `study-left-panel.tsx` — sources sidebar (document list, upload trigger)
  - `study-content-panel.tsx` — center passage reader with simplify toggle
  - `study-right-panel.tsx` — studio panel (quiz, flashcards, summary cards)
  - `study-quiz-content.tsx` — quiz question rendering + answer feedback
  - `study-upload-modal.tsx` — file/text upload modal
  - `study-types.ts` — shared types (StudyState, PassageData, QuestionData, etc.)
  - `error.tsx` — error boundary
- `src/app/actions/study-simplify-action.ts` — server action for content simplification
- `src/app/actions/study-generate-questions-action.ts` — server action for question generation
- `src/app/actions/study-upload-action.ts` — server action for upload + analysis
- `src/app/actions/study-shared.ts` — shared helpers for study server actions
- `useDefaultLayout` hook — panel sizes persist to localStorage via react-resizable-panels

### Changed
- Replaced fixed-width three-panel layout with `react-resizable-panels` v4
- Panel constraints: min 220px, max 70%, 10px draggable gaps (Separator components)
- Panel layout persisted per-user via `localStorage` key `study-panels`

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
  - Primary: Google Gemini 1.5 Flash via Vercel AI SDK (`@ai-sdk/google`)
  - Fallback: Heuristic (avg sentence length + complex word ratio)
- Content simplification to one CEFR level below original
- Comprehension question generation (5 MC/TF per passage with source citations)
- Flashcard test UI (`/test/[id]`) with multiple choice and true/false questions
- SM-2 spaced repetition algorithm (`lib/sm2-algorithm.ts`)
- SQLite database via Prisma ORM (`prisma/schema.prisma`):
  - User, Passage, Question, CardReview, StudySession models
- Progress dashboard (`/progress`) with stats and due cards
- Study session tracking (start/complete with cards reviewed, accuracy rate)
- `app/actions/analyze.ts` — orchestrstrator server action
- `lib/db-utils.ts` — centralized DB operations
- `lib/upload-validator.ts` — file validation (type, size 10MB, text length 50-100k)

### Fixed
- Question options parsing (JSON string → typed array) in flashcard test page
- Study session accuracy rate calculation

---

**Status:** Active  
**Last Updated:** 2026-05-06
