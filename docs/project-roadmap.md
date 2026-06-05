# Project Roadmap

**English Reading Training App**

---

## Progress Summary

| Phase | Scope | Completion |
|-------|-------|------------|
| Phase 1: Core MVP | Upload, CEFR, simplify, questions, flashcards, progress | 100% ✅ |
| Phase 2: Sentry Errors/Logging | Error tracking, Pino logging, server action instrumentation | 100% ✅ |
| Phase 3: Sentry Performance | Pino→Sentry log forwarding, performance spans | 100% ✅ |
| Phase 4: Sentry Source Maps | Production debugging with readable stack traces | 100% ✅ |
| Phase 5: Content Expansion | YouTube transcription, OCR for scanned PDFs | 0% 🔲 |
| Phase 6: Advanced Features | Resizable workspace, analytics dashboard | 70% 🔧 |
| Phase 7: Clerk Auth | Email/password + Google OAuth, middleware, profile sync | 100% ✅ |
| Phase 8: Production Infra | Neon PostgreSQL, Vercel Blob, Vercel deploy contract | 75% 🔧 |
| Phase 9: Study Chat | AI chat assistant in Studio panel with passage context | 70% 🔧 |
| Phase 10: Translation | Word selection, dictionary, cache/history, vocabulary | 65% 🔧 |

---

## Phase Details

### Phase 1: Core MVP (Completed 2026-04-27)

Text + PDF upload, CEFR detection (AI + heuristic fallback), content simplification, question generation (5 MC/TF per passage), flashcard test UI, SM-2 spaced repetition, progress dashboard, study session tracking, SQLite via Prisma.

### Phase 2-4: Sentry Integration (Completed 2026-04-28 to 2026-05-01)

`@sentry/nextjs` error tracking, Pino structured logging, `Sentry.withServerActionInstrumentation()`, breadcrumbs for AI/DB ops, performance spans (`ai:*`, `db:*`), Pino→Sentry log forwarding, source maps upload for production debugging.

### Phase 5: Content Expansion (Planned)

YouTube URL → transcript via Whisper API, scanned PDF text extraction (OCR), new sourceType values in Passage model.

### Phase 6: Advanced Features (In Progress — 70%)

**Done:**
- Resizable three-panel study workspace with localStorage persistence
- Study server actions (simplify, generate questions, upload)
- Right panel results section refactor
- Flashcard test component refactor (test-header, test-passage-panel, test-question-card, test-results-screen)
- Dashboard sidebar navigation
- Global error boundary component

**Planned:**
- Extended analytics dashboard
- Detailed progress per passage/question
- Custom UI themes

### Phase 7: Clerk Authentication (Completed)

Clerk sign-in/sign-up pages, Google OAuth, middleware route protection, account controls, and profile sync into `UserProfile`. Demo-user logic has been replaced by authenticated Clerk users in server actions and API routes.

### Phase 8: Production Infrastructure (In Progress - 75%)

**Done:**
- SQLite -> PostgreSQL migration on Neon
- Prisma client restructured around the `@prisma/adapter-pg` Postgres adapter and separate query modules per domain
- Vercel Blob integration for preview/production file uploads
- Local filesystem storage adapter for development
- Clerk development/production environment split documented
- Neon branch and migration environment contract documented
- Zod validation across all server actions and API routes
- `prisma.config.ts` with `DIRECT_URL` for migrations
- User model migrated to `UserProfile` with Clerk identity integration
- ERD auto-generation via `prisma-erd-generator`

**Planned:**
- Final Vercel production environment verification
- Scheduled expired-upload cleanup verification
- Multi-user load testing

---

## Recent Changes (since 2026-05-09)

- Clerk auth replaced the previous auth provider and now owns sign-in/sign-up, OAuth, and route protection.
- Neon environment contract defines development, preview, and production database branches.
- Vercel Blob storage replaced provider-specific object storage for uploaded files outside local development.
- Translate flow performance: 7→≤4 blocking Prisma queries (single `$queryRaw` dictionary lookup, cache-first ordering, non-blocking history)
- Dictionary seed system with multi-source dataset generator and benchmark dataset
- Benchmark gate with per-scenario query budgets and warm-up handling
- Zod schema validation for study sessions and question options
- Simplified Prisma database client setup (removed legacy extensions)
- Database layer restructured into domain-specific query modules
- AI modules refactored to standalone exported functions with Zod schemas

---

## Unresolved Questions

1. PDF size limits for production (currently 10MB)
2. YouTube video length constraints for Phase 5
3. Final production Vercel environment verification
4. Offline capability requirements

---

### Phase 9: Study Chat (In Progress)

**Goal:** AI chat assistant embedded in the Studio panel, context-aware of the active passage.

**Scope:**
- `POST /api/study-chat` route handler using `streamText` (Vercel AI SDK v6) with passage content in system prompt
- `useChat` hook (`@ai-sdk/react`) for streaming chat UI in Studio panel
- New `StudioCardId: 'chat'` card in Studio panel — opens inline chat view
- Chat history scoped to current passage session
- System prompt: English reading tutor that explains vocabulary, grammar, and meaning

**Status:** API route, dependency, and message persistence exist; UI completion and product polish remain.

### Phase 10: Translation (In Progress - 65%)

**Goal:** Word-by-word dictionary lookup + paragraph translation using the chat function.

**Done:**
- Dictionary seed system with normalized split files (`prisma/seed.ts`)
- Quick translate flow: single-query dictionary lookup, cache-first ordering, non-blocking history
- Benchmark gate enforcing ≤4 Prisma queries for single-word dictionary hit
- `/api/translate` and `/api/vocabulary` endpoints with Zod validation
- Selection translation popup and study translation panel

**Planned:**
- Paragraph-level translation flow polish
- Saved vocabulary review experience
- Dictionary popover refinements

**Depends on:** Stable dictionary seed/import quality and translation provider reliability.

**See also:** Business milestones → [`docs/database/brd.md`](database/brd.md)

---

**Status:** Active
**Last Updated:** 2026-06-05
