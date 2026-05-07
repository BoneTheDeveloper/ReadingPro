# Project Roadmap

**English Reading Training App**

---

## Project Phases

### Phase 1: Core MVP (Completed 2026-04-27)
**Scope:** Text + PDF upload, CEFR detection, content simplification, flashcards, progress tracking

| Feature | Status |
|---------|--------|
| Text content upload | ✅ Done |
| PDF upload + parsing (pdf-parse) | ✅ Done |
| CEFR level detection (OpenAI gpt-4o-mini + heuristic fallback) | ✅ Done |
| Content simplification (OpenAI gpt-4o-mini) | ✅ Done |
| Question generation (OpenAI gpt-4o-mini, 5 MC/TF per passage) | ✅ Done |
| Flashcard test UI (`/test/[id]`) | ✅ Done |
| SM-2 spaced repetition algorithm | ✅ Done |
| Progress dashboard (`/progress`) | ✅ Done |
| Study session tracking | ✅ Done |
| SQLite database (Prisma ORM) | ✅ Done |

---

### Phase 2: Sentry Integration — Errors & Logging (Completed 2026-04-28)
**Scope:** Error tracking, Pino structured logging, server action instrumentation

| Feature | Status |
|---------|--------|
| `@sentry/nextjs` package integration | ✅ Done |
| `sentry.server.config.ts` initialization | ✅ Done |
| `Sentry.withServerActionInstrumentation()` on analyze actions | ✅ Done |
| `Sentry.captureException()` in API routes | ✅ Done |
| `Sentry.addBreadcrumb()` for AI/DB operation tracking | ✅ Done |
| Pino structured logging (`lib/core/logger.ts`) | ✅ Done |
| Environment-based log levels (`LOG_LEVEL` env var) | ✅ Done |

---

### Phase 3: Sentry Performance Monitoring (Completed 2026-05-01)
**Scope:** Pino→Sentry log forwarding, performance spans for AI/DB/file operations

| Feature | Status |
|---------|--------|
| `Sentry.pinoIntegration()` in `sentry.server.config.ts` | ✅ Done |
| Forward Pino errors/fatal as Sentry errors | ✅ Done |
| Forward Pino warn/error/fatal as Sentry logs | ✅ Done |
| `Sentry.startSpan()` — AI ops (`ai:cefr-detect`, `ai:content-simplify`, `ai:question-gen`) | ✅ Done |
| `Sentry.startSpan()` — DB ops (`db:user-lookup`, `db:passage-create`, `db:session-create`, `db:session-update`, `db:card-review-update`) | ✅ Done |
| `Sentry.startSpan()` — File ops (`file-write`, `pdf-parse`) | ✅ Done |

---

### Phase 4: Sentry Source Maps Upload (Completed 2026-05-01)
**Scope:** Production debugging with readable stack traces via source maps upload

| Feature | Status |
|---------|--------|
| `authToken` from `SENTRY_AUTH_TOKEN` env var (CI only) | ✅ Done |
| `org` and `project` configurable via env vars with fallbacks | ✅ Done |
| `widenClientFileUpload: true` for complete source maps | ✅ Done |
| `tunnelRoute: "/monitoring"` to bypass ad-blockers | ✅ Done |
| `silent: !process.env.CI` for CI-only upload logs | ✅ Done |
| `webpack.treeshake.removeDebugLogging` for bundle optimization | ✅ Done |
| `webpack.automaticVercelMonitors` for Cron Monitors | ✅ Done |
| `.env.example` CI setup instructions | ✅ Done |

---

### Phase 5: Content Expansion (Planned)
**Scope:** YouTube transcription (Whisper), scanned PDF OCR

| Feature | Status |
|---------|--------|
| YouTube URL → transcript (Whisper API) | 🔲 Planned |
| Scanned PDF text extraction (OCR) | 🔲 Planned |
| New sourceType values in Passage model | 🔲 Planned |

---

### Phase 6: Advanced Features (In Progress)
**Scope:** Resizable study workspace, advanced analytics, detailed progress, custom themes

| Feature | Status |
|---------|--------|
| Resizable three-panel study workspace (`/study`) | ✅ Done |
| react-resizable-panels v4 with localStorage persistence | ✅ Done |
| Study server actions (simplify, generate questions, upload) | ✅ Done |
| Right panel results section refactor | ✅ Done |
| Extended analytics dashboard | 🔲 Planned |
| Detailed progress per passage/question | 🔲 Planned |
| Custom UI themes (user preference) | 🔲 Planned |

---

### Phase 7: Supabase Authentication (In Progress)
**Scope:** Email/password + Google OAuth, middleware route protection, user sync

| Feature | Status |
|---------|--------|
| `@supabase/supabase-js` + `@supabase/ssr` packages | ✅ Done |
| Supabase client utilities (browser, server, middleware) | ✅ Done |
| `supabaseAuthId` column in User model | ✅ Done |
| Sign-in page (`/sign-in`) with email/password + Google OAuth | ✅ Done |
| Sign-up page (`/sign-up`) with email/password + Google OAuth | ✅ Done |
| OAuth callback route (`/auth/callback`) with user sync | ✅ Done |
| Middleware route protection (redirect to `/sign-in`) | ✅ Done |
| User menu in sidebar with sign-out | ✅ Done |
| Sign-out components and hooks | ✅ Done |
| Replace demo user in all actions/routes | ✅ Done |

---

### Phase 8: Production Deployment (Future)
**Scope:** PostgreSQL migration, Vercel deployment, multi-user auth

| Feature | Status |
|---------|--------|
| SQLite → PostgreSQL migration | 🔲 Future |
| Vercel deployment setup | 🔲 Future |
| Multi-user support (remove demo user) | 🔲 Future |

---

## Progress Summary

| Phase | Completion |
|-------|-------------|
| Phase 1 (MVP) | 100% ✅ |
| Phase 2 (Sentry Errors/Logging) | 100% ✅ |
| Phase 3 (Sentry Performance) | 100% ✅ |
| Phase 4 (Sentry Source Maps) | 100% ✅ |
| Phase 5 (Content Expansion) | 0% 🔲 |
| Phase 6 (Advanced Features) | 60% 🔧 |
| Phase 7 (Supabase Auth) | 100% ✅ |
| Phase 8 (Production Deployment) | 0% 🔲 |

---

## Unresolved Questions

1. PDF size limits for production (currently 10MB)
2. YouTube video length constraints for Phase 5
3. PostgreSQL migration timing (from SQLite)
4. Offline capability requirements

---

**Status:** Active  
**Last Updated:** 2026-05-07

---
**Note:** Supabase Auth (email/password + Google OAuth) in progress, middleware route protection active, OAuth setup guide at docs/auth/oauth-setup-guide.md
