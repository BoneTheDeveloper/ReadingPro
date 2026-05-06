# Codebase Summary

**English Reading Training App**

---

## Project Overview

AI-powered English reading comprehension trainer. Users upload text/PDF, app detects CEFR level (A1-C2), simplifies content, generates comprehension questions with source citations, and tracks learning via SM-2 spaced repetition.

**Stage:** Early MVP (no auth, hardcoded demo user)

---

## Tech Stack (Actual)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.4 (App Router, RSC) |
| UI | React 19.2.4, shadcn/ui (base-nova), Tailwind CSS 4 |
| AI | Vercel AI SDK v6 + Google Gemini 1.5 Flash (`@ai-sdk/google`) |
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
│   │   ├── upload/text-route.ts          # POST: duplicate text route (leftover)
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
├── components/
│   ├── ui/                               # shadcn/ui primitives
│   ├── upload-zone.tsx                   # Drag-and-drop upload
│   ├── text-input-area.tsx               # Text paste input
│   └── progress-dashboard.tsx            # Progress stats display
└── lib/
    ├── db.ts                             # Prisma client singleton
    ├── db-utils.ts                       # DB operations (SM-2, CRUD)
    ├── utils.ts                          # cn() utility
    ├── pdf-parser.ts                     # PDF text extraction
    ├── upload-validator.ts               # File/text validation
    ├── cefr-utils.ts                     # CEFR color/label helpers
    ├── reading-utils.ts                  # Reading time, word highlighting
    ├── sm2-algorithm.ts                  # SM-2 standalone implementation
    └── ai/
        ├── cefr-detector.ts              # AI CEFR detection + heuristic fallback
        ├── content-simplifier.ts         # AI text simplification
        └── question-generator.ts         # AI question generation
```

---

## Data Models (Prisma)

| Model | Key Fields |
|-------|-----------|
| **User** | id, email, name?, targetLevel (CEFR, default B2) |
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

All routes use hardcoded `demo@example.com` user.

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

---

## Key Features Implemented

1. Content upload (txt/pdf, max 10MB) or text paste (50-100k chars)
2. AI CEFR detection (Gemini + heuristic fallback)
3. AI content simplification (one CEFR level below)
4. AI comprehension question generation (5 questions, MC/TF, with source citations)
5. Reading view with original/simplified toggle
6. Flashcard test mode (progress bar, streaks, keyboard shortcuts 1-4/Enter)
7. SM-2 spaced repetition for review scheduling
8. Progress dashboard (total, mature, due, today's reviews)
9. Study session tracking
10. Resizable study workspace — three-panel layout (sources, content, studio) with draggable dividers, persisted sizes via localStorage, 220px min / 70% max constraints

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite connection string (default: `file:./dev.db`) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key (required) |

---

## Known Issues

- No authentication (hardcoded demo user)
- Duplicate route: `api/upload/text-route.ts` duplicates `api/upload/text/route.ts`
- Processing page is simulated (fake progress, auto-redirects after ~6s)
- SM-2 calculation duplicated in `sm2-algorithm.ts` and `db-utils.ts`
- No tests exist
- No dashboard layout (no shared nav/auth)
- Unused deps: `react-hook-form`, `date-fns`, `@base-ui/react`, `@types/bcryptjs`
- Home page "Study Cards" links to `/progress` (no dedicated review page)

---

**Status:** Active
**Last Updated:** 2026-05-06
