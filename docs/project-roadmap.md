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
| Phase 7: Supabase Auth | Email/password + Google OAuth, middleware, user sync | 100% ✅ |
| Phase 8: Production Infra | PostgreSQL migration, Supabase Storage, Vercel deploy | 60% 🔧 |
| Phase 9: Study Chat | AI chat assistant in Studio panel with passage context | 0% 🔲 |
| Phase 10: Translation | Word-by-word dictionary + paragraph translation via chat | 0% 🔲 |

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

### Phase 7: Supabase Authentication (Completed 2026-05-07)

Supabase Auth (email/password + Google OAuth), middleware route protection, sign-in/sign-up pages, OAuth callback with user sync, UserMenu with sign-out, demo user replaced with authenticated users in all actions/routes.

### Phase 8: Production Infrastructure (In Progress — 60%)

**Done:**
- SQLite → PostgreSQL migration (Supabase hosted)
- Prisma client restructured: `PrismaPg` adapter, separate query modules per domain
- Supabase Storage integration for file uploads (replaces local file storage)
- Prisma client security extension for auto user context injection
- Zod validation across all server actions and API routes
- `prisma.config.ts` with `DIRECT_URL` for migrations
- User model migrated to UserProfile with Supabase auth integration
- ERD auto-generation via `prisma-erd-generator`

**Planned:**
- Vercel deployment setup
- Production environment configuration
- Multi-user load testing

---

## Recent Changes (since 2026-05-09)

- Prisma client security extension for auto userId injection from Supabase session
- Zod schema validation for study sessions and question options
- Simplified Prisma database client setup (removed legacy extensions)
- Database layer restructured into domain-specific query modules
- AI modules refactored to standalone exported functions with Zod schemas

---

## Unresolved Questions

1. PDF size limits for production (currently 10MB)
2. YouTube video length constraints for Phase 5
3. Vercel deployment timeline and environment setup
4. Offline capability requirements

---

### Phase 9: Study Chat (Planned)

**Goal:** AI chat assistant embedded in the Studio panel, context-aware of the active passage.

**Scope:**
- `POST /api/study-chat` route handler using `streamText` (Vercel AI SDK v6) with passage content in system prompt
- `useChat` hook (`@ai-sdk/react`) for streaming chat UI in Studio panel
- New `StudioCardId: 'chat'` card in Studio panel — opens inline chat view
- Chat history scoped to current passage session
- System prompt: English reading tutor that explains vocabulary, grammar, and meaning

**Depends on:** `@ai-sdk/react` package (needs install)

### Phase 10: Translation (Planned)

**Goal:** Word-by-word dictionary lookup + paragraph translation using the chat function.

**Scope:**
- Word-by-word: Click/tap any word in `StudyContentPanel` → popover with dictionary definition (Free Dictionary API) + Vietnamese translation (via AI chat)
- Paragraph translation: "Translate passage" button sends paragraph to chat endpoint with translation system prompt
- New `StudioCardId: 'translate'` card in Studio panel — enables/disabled
- Word selection hook (`use-word-selection`) for detecting clicked words
- Dictionary popover component

**Depends on:** Phase 9 (uses chat endpoint for AI-powered translation)

**See also:** Business milestones → [`docs/database/brd.md`](database/brd.md)

---

**Status:** Active
**Last Updated:** 2026-05-11
