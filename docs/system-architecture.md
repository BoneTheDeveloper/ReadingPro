# System Architecture

**English Reading Training App**

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  React 19 + Next.js App Router + Tailwind CSS + shadcn/ui       │
│  @supabase/ssr (browser client for auth + storage)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js Server (Node.js)                     │
│  ┌──────────────────┐  ┌─────────────────────────────────────┐  │
│  │    Middleware     │  │        Server Actions / API Routes   │  │
│  │  Session refresh │  │  analyze │ upload │ cards │ progress │  │
│  │  Route protect   │  └──────┬──────────┬────────┬───────────┘  │
│  └──────────────────┘         │          │        │              │
└───────────────────────────────┼──────────┼────────┼──────────────┘
                                │          │        │
                          ┌─────┴──┐  ┌────┴────┐  ┌─┴──┐  ┌──────┐
                          ▼        ▼  ▼         ▼  ▼    ▼  ▼      ▼
                       ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐┌──────┐
                       │OpenAI│ │pdf-  │ │ SM-2 │ │Post- ││Supa- │
                       │  AI  │ │parse │ │Algo  │ │greSQL││base  │
                       │(gpt-4o│ │      │ │      │ │(Supa-││Auth +│
                       │mini) │ │      │ │      │ │base) ││Stor. │
                       └──────┘ └──────┘ └──────┘ └──────┘└──────┘
```

---

## Data Flow: Content Upload & Analysis

```
User uploads file/pastes text
         │
         ▼
┌──────────────────┐
│  Upload API      │  POST /api/upload or /api/upload/text
│  Validation      │  File type (txt/pdf), size (10MB), text length (50-100k)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  PDF Parser      │  If PDF: extract text via pdf-parse
│  (if needed)     │  Extract title from first line
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  analyzeContent  │  Server action (orchestrator)
│  Action          │  Calls 2 AI services + heuristic CEFR
└────────┬─────────┘
         │
    ┌────┴─────┬────────────┐
    ▼          ▼            ▼
┌────────┐ ┌─────────┐ ┌──────────┐
│ CEFR   │ │Content  │ │Question  │
│Heuris- │→│Simplify │→│Generator │
│tic     │ │         │ │          │
└────────┘ └─────────┘ └────┬─────┘
                                │
                                ▼
                    ┌──────────────────┐
                    │  PostgreSQL DB   │
                    │  (Supabase)      │
                    │  Persist:        │
                    │  - Passage       │
                    │  - Questions     │
                    │  - File → Storage│
                    └──────────────────┘
```

---

## Data Flow: Flashcard Test & SM-2

```
User navigates to /test/[id]
         │
         ▼
┌──────────────────┐
│  GET Passage +   │  Server component fetches from DB
│  Questions       │  (via passage-queries.ts)
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  FlashcardTest   │  Client component renders quiz
│  Client          │  Tracks selections, streak, score
└────────┬─────────┘
         │
         ▼ (each answer)
┌──────────────────┐
│  POST /api/cards │  Submit quality rating (0-5)
│  /review         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  SM-2 Algorithm  │  Calculate new easeFactor,
│  (card-review-   │  intervalDays, nextReviewDate
│   queries.ts)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  UPDATE          │  Upsert CardReview record
│  CardReview      │  (unique on [questionId, userId])
└──────────────────┘
```

---

## Data Flow: Spaced Repetition Review

```
User navigates to /progress → clicks "Study Now"
         │
         ▼
┌──────────────────┐
│  GET /api/cards  │  Fetch cards where
│  /due            │  nextReviewDate <= now
│                  │  Limit: 20 cards
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  POST /api/      │  Create StudySession
│  study-session   │  Record startedAt
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Review loop     │  For each card:
│                  │  - Show question
│                  │  - User answers
│                  │  - Rate quality (0-5)
│                  │  - SM-2 updates interval
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  PATCH /api/     │  Complete session:
│  study-session   │  completedAt, cardsReviewed,
│                  │  accuracyRate
└──────────────────┘
```

---

## Data Flow: Authentication

```
Protected route → Middleware session refresh
    → No session → redirect /sign-in?next={original}
    → Has session → Server action/route uses authenticated user

Email/Password: /sign-in → signInWithPassword() → redirect
Google OAuth:   /sign-in → Google consent → /auth/callback → syncUser → redirect

All server actions/routes:
  getAuthenticatedUser() → requireAuth() → getCurrentUser()
  Prisma client extension auto-injects userId from Supabase session
```

---

## Data Flow: File Storage

```
User uploads PDF
         │
         ▼
┌──────────────────┐
│  Upload API      │  POST /api/upload
│  route.ts        │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Supabase Storage│  uploadFile() → {bucket}/{userId}/{filename}
│  (lib/storage/)  │  Returns public URL stored in Passage.fileUrl
└──────────────────┘
```

---

## Module Dependency Map

```
app/actions/analyze.ts (orchestrator)
├── lib/shared/cefr-utils.ts     → heuristic CEFR detection
├── lib/ai/content-simplifier.ts → ai SDK
├── lib/ai/question-generator.ts → ai SDK
├── lib/ai/prompt-utils.ts       → text wrapping helpers
└── lib/db/passage-queries.ts    → lib/db/client.ts (Prisma + PrismaPg)

app/api/upload/route.ts
├── lib/validation/upload.ts
├── lib/parsers/pdf.ts
├── lib/storage/supabase-storage.ts  → Supabase Storage
└── app/actions/analyze.ts

app/api/cards/review/route.ts    → lib/db/card-review-queries.ts (SM-2, upsert)
app/api/cards/due/route.ts       → lib/db/card-review-queries.ts (getDueCards)
app/api/progress/stats/route.ts  → lib/db/card-review-queries.ts (getUserProgress)
app/api/study-session/route.ts   → lib/db/study-session-queries.ts

lib/auth/auth-utils.ts
├── lib/supabase/server.ts       → @supabase/ssr
└── lib/db/client.ts              → Prisma (auto user context via extension)

lib/auth/sync-user.ts            → lib/db/client.ts
```

---

## Database Layer Architecture

```
Prisma Client (lib/db/client.ts)
├── PrismaPg adapter (PostgreSQL via DATABASE_URL)
├── Security extension: auto userId injection from Supabase session
└── Singleton pattern via globalThis

Query Modules (per domain):
├── passage-queries.ts      → getUserPassages, getPassageWithQuestions, createPassage, createQuestion, getNewCards
├── card-review-queries.ts  → getDueCards, updateCardReview, createCardReview, getUserProgress, calculateSM2Interval
└── study-session-queries.ts → createStudySession, updateStudySession, computeSessionAccuracy
```

---

## Rendering Strategy

| Page | Type | Data Fetching |
|------|------|--------------|
| `/` | Server Component | Static |
| `/sign-in`, `/sign-up` | Client Component | None (auth pages) |
| `/auth/callback` | Route Handler | OAuth code exchange |
| `/upload` | Client Component | None |
| `/reading/[id]` | Server → Client | Server fetches passage |
| `/test/[id]` | Server → Client | Server fetches passage+questions |
| `/study` | Client Component | `force-dynamic`, actions for data |
| `/progress` | Server → Client | Server fetches stats |

---

**See also:**
- Data models & schema → [`docs/database/data-dictionary.md`](database/data-dictionary.md)
- ERD → [`docs/database/erd.md`](database/erd.md)
- API endpoints & requirements → [`docs/database/srs.md`](database/srs.md)

---

**Status:** Active
**Last Updated:** 2026-05-11
