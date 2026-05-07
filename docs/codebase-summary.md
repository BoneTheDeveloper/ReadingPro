# Codebase Summary

**English Reading Training App**

---

## Project Overview

AI-powered English reading comprehension trainer. Users upload text/PDF, app detects CEFR level (A1-C2), simplifies content, generates comprehension questions with source citations, and tracks learning via SM-2 spaced repetition.

**Stage:** MVP with authentication UI, hardcoded demo user pending replacement

---

## Tech Stack (Actual)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.4 (App Router, RSC) |
| UI | React 19.2.4, shadcn/ui (base-nova), Tailwind CSS 4 |
| AI | Vercel AI SDK v6 + OpenAI gpt-4o-mini (`@ai-sdk/openai`) |
| Auth | Supabase Auth (`@supabase/supabase-js` + `@supabase/ssr`) |
| Database | SQLite via `better-sqlite3` + Prisma ORM v7.8 |
| PDF | `pdf-parse` v2.4.5 |
| Validation | Zod v4 |
| File Upload | `react-dropzone` v15 |
| Panel Layout | `react-resizable-panels` v4 |
| Icons | Lucide React |
| TypeScript | Strict mode |

---

## Directory Structure

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── layout.tsx                        # Root layout (Geist fonts)
│   ├── globals.css                       # Tailwind + shadcn theme
│   ├── actions/analyze.ts                # Server action: full analysis pipeline
│   │   study-simplify-action.ts           # Server action: simplify passage content
│   │   study-generate-questions-action.ts # Server action: generate quiz questions
│   │   study-upload-action.ts             # Server action: upload + analyze for study page
│   │   study-shared.ts                    # Shared helpers for study actions
│   ├── api/
│   │   ├── upload/route.ts               # POST: file upload + analyze
│   │   ├── upload/text/route.ts          # POST: text content + analyze
│   │   ├── cards/review/route.ts         # POST: submit SM-2 card review
│   │   ├── cards/due/route.ts            # GET: fetch due cards
│   │   ├── study-session/route.ts        # POST+PATCH: session CRUD
│   │   └── progress/stats/route.ts       # GET: user progress stats
│       └── (dashboard)/
│           ├── upload/page.tsx               # File/text upload with toggle
│           ├── progress/page.tsx             # Progress dashboard
│           ├── processing/page.tsx           # Processing animation (simulated)
│           ├── study/
│           │   ├── page.tsx                  # Study page (force-dynamic)
│           │   ├── study-page-client.tsx     # Resizable 3-panel layout (Group/Panel/Separator)
│           │   ├── study-left-panel.tsx      # Sources panel
│           │   ├── study-right-panel.tsx     # Studio panel (quiz, summary, default)
│           │   ├── study-content-panel.tsx   # Center content panel
│           │   └── study-studio-panel.tsx    # Studio panel wrapper
│           ├── reading/[id]/
│       │   ├── page.tsx                  # Reading view (server)
│       │   └── reading-view-client.tsx   # Reading view (client)
│       └── test/[id]/
│           ├── page.tsx                  # Flashcard test (server)
│           └── flashcard-test-client.tsx # Flashcard test (client)
│   └── study/
│       ├── page.tsx                      # Study workspace (force-dynamic)
│       ├── study-page-client.tsx         # Three resizable panels (react-resizable-panels)
│       ├── study-left-panel.tsx          # Sources sidebar (document list + upload trigger)
│       ├── study-content-panel.tsx       # Center: passage reader with simplify toggle
│       ├── study-right-panel.tsx         # Studio: quiz, flashcards, summary cards
│       ├── study-quiz-content.tsx        # Quiz question rendering + answer feedback
│       ├── study-upload-modal.tsx        # Upload modal (file/text)
│       ├── study-types.ts                # Shared types (StudyState, PassageData, QuestionData)
│       └── error.tsx                     # Error boundary
│   ├── (auth)/
│   │   ├── layout.tsx                    # Auth pages centered layout
│   │   ├── sign-in/page.tsx              # Email/password + Google OAuth sign-in
│   │   └── sign-up/page.tsx              # Email/password + Google OAuth sign-up
│   └── auth/callback/route.ts           # OAuth callback handler
├── components/
│   ├── ui/                               # shadcn/ui primitives
│   ├── user-menu.tsx                    # User dropdown menu with real data
│   ├── sign-out-button.tsx              # Sign-out button for sidebar
│   ├── upload-zone.tsx                   # Drag-and-drop upload
│   ├── text-input-area.tsx               # Text paste input
│   └── progress-dashboard.tsx            # Progress stats display
└── lib/
    ├── supabase/
    │   ├── client.ts                    # Browser client
    │   ├── server.ts                    # Server client
    │   └── middleware.ts                # Session management
    ├── db/client.ts                     # Prisma client singleton
    ├── db/utils.ts                      # DB operations (SM-2, CRUD)
    ├── shared/utils.ts                  # cn() utility
    ├── parsers/pdf.ts                   # PDF text extraction
    ├── validation/upload.ts            # File/text validation
    ├── shared/cefr-utils.ts             # CEFR color/label helpers
    ├── shared/reading-utils.ts          # Reading time, word highlighting
    ├── algorithms/sm2.ts                # SM-2 standalone implementation
    ├── core/logger.ts                   # Pino structured logging
    ├── core/sentry.ts                   # Sentry client configuration
    └── ai/
        ├── cefr-detector.ts            # AI CEFR detection + heuristic fallback
        ├── content-simplifier.ts       # AI text simplification
        └── question-generator.ts        # AI question generation
```

---

## Data Models (Prisma)

| Model | Key Fields |
|-------|-----------|
| **User** | id, email, name?, supabaseAuthId (nullable, unique), targetLevel (CEFR, default B2) |
| **Passage** | id, userId, title, content, simplifiedContent?, originalLevel?, simplifiedLevel?, wordCount, sourceType |
| **Question** | id, passageId, questionText, options (JSON), correctOption, sourceText, sourceLine, explanation, questionType, difficulty |
| **CardReview** | id, questionId, userId, qualityRating, easeFactor, intervalDays, repetitions, nextReviewDate |
| **StudySession** | id, userId, passageId?, startedAt, completedAt?, cardsReviewed, accuracyRate? |

**Enums:** `CEFRLevel` (A1-C2), `SourceType` (TEXT/PDF), `QuestionType` (MULTIPLE_CHOICE/TRUE_FALSE)

---

## API Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/upload` | Upload file (txt/pdf), extract text, analyze |
| POST | `/api/upload/text` | Submit text content, validate, analyze |
| POST | `/api/cards/review` | Submit card review with quality (0-5), update SM-2 |
| GET | `/api/cards/due` | Fetch up to 20 due cards |
| POST | `/api/study-session` | Create study session |
| PATCH | `/api/study-session` | Update session with completion data |
| GET | `/api/progress/stats` | Get progress stats (total, mature, due, today) |

All routes use hardcoded `demo@example.com` user (except auth routes which use real Supabase users)

---

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page (Upload, Progress, Study Cards cards) |
| `/upload` | File upload or text paste |
| `/processing` | Simulated processing animation |
| `/reading/[id]` | Reading view with original/simplified toggle |
| `/test/[id]` | Flashcard test with feedback and scoring |
| `/study` | Three-panel resizable workspace (sources, content, studio) |
| `/progress` | Progress dashboard with stats |
| `/auth/callback` | OAuth callback handler |

---

## Key Features Implemented

1. Content upload (txt/pdf, max 10MB) or text paste (50-100k chars)
2. AI CEFR detection (OpenAI gpt-4o-mini + heuristic fallback)
3. AI content simplification (OpenAI gpt-4o-mini, one CEFR level below)
4. AI comprehension question generation (OpenAI gpt-4o-mini, 5 questions, MC/TF, with source citations)
5. Reading view with original/simplified toggle
6. Flashcard test mode (progress bar, streaks, keyboard shortcuts 1-4/Enter)
7. SM-2 spaced repetition for review scheduling
8. Progress dashboard (total, mature, due, today's reviews)
9. Study session tracking
10. Resizable study workspace — three-panel layout (sources, content, studio) with draggable dividers, persisted sizes via localStorage, 220px min / 70% max constraints (STUDY PAGE IS NOW PRIMARY WORKSPACE)

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite connection string (default: `file:./dev.db`) |
| `OPENAI_API_KEY` | OpenAI API key (required) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key |

---

## Known Issues

- **Authentication UI complete** - UserMenu, sign-out components implemented, but server actions still use hardcoded demo user
- Sentry example API route: `/api/sentry-example-api/route.ts`
- Processing page is simulated (fake progress, auto-redirects after ~6s)
- SM-2 calculation duplicated in `sm2-algorithm.ts` and `db-utils.ts`
- No tests exist
- Dashboard layout with navigation sidebar implemented
- Unused deps: `react-hook-form`, `date-fns`, `@base-ui/react`
- Home page "Study Cards" links to `/progress` (no dedicated review page)

---

## Recent Updates

### Phase 05-06: Authentication UI & Testing
- ✅ UserMenu component with real user name/email display and avatar
- ✅ Dropdown menu for user actions in desktop sidebar
- ✅ Mobile menu support with dropdown and sign-out button
- ✅ `useSignOut` shared hook for sign-out functionality
- ✅ SignOutButton components for sidebar integration
- ✅ Build, lint, and TypeScript compilation passing
- ⏳ Demo user replacement in server actions/routes pending (Phase 07)

---
**Status:** Active
**Last Updated:** 2026-05-07

---
**Current State:** Supabase Auth (email/password + Google OAuth) implemented with UI components, middleware route protection active, UserMenu and sign-out functionality complete
