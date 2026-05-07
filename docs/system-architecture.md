# System Architecture

**English Reading Training App**

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  React 19 + Next.js App Router + Tailwind CSS + shadcn/ui       │
│  @supabase/ssr (browser client for auth)                        │
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
                       │OpenAI│ │pdf-  │ │ SM-2 │ │SQLite││Supa- │
                       │  AI  │ │parse │ │Algo  │ │ DB   ││base  │
                       │(gpt-4o│ │      │ │      │ │      ││Auth  │
                       │mini) │ │      │ │      │ │      ││      │
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
│  Action          │  Calls 3 AI services sequentially
└────────┬─────────┘
         │
    ┌────┴────┬────────────┐
    ▼         ▼            ▼
┌────────┐ ┌─────────┐ ┌──────────┐
│ CEFR   │ │Content  │ │Question  │
│Detect  │→│Simplify │→│Generator │
└────────┘ └─────────┘ └────┬─────┘
                                │
                                ▼
                    ┌──────────────────┐
                    │  SQLite Database │
                    │  Persist:        │
                    │  - Passage       │
                    │  - Questions     │
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
│  Questions       │
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
│  (db-utils.ts)   │  intervalDays, nextReviewDate
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
User visits protected route (e.g. /study)
         │
         ▼
┌──────────────────┐
│   Middleware      │  src/middleware.ts
│  updateSession() │  Refreshes Supabase session via cookie exchange
│  Route protect   │  No auth cookie → redirect to /sign-in?next=/study
└────────┬─────────┘
         │
         ▼ (has session)
┌──────────────────┐
│  Server Action / │  Uses createServerActionClient()
│  API Route       │  Gets authenticated user via supabase.auth.getUser()
└──────────────────┘

Email/Password Sign-In:
  /sign-in → signInWithPassword() → redirect to /study

Google OAuth Sign-In:
  /sign-in → signInWithOAuth() → Google consent → /auth/callback
  → exchangeCodeForSession() → syncUser() → redirect to /study

User Sync (on first sign-up):
  Supabase Auth user.id → upsert into local users.supabaseAuthId
  Creates local User row with email + name from auth metadata
```

---

## Database Schema

```
┌─────────────┐       ┌──────────────┐       ┌──────────────┐
│    User     │       │   Passage    │       │   Question   │
├─────────────┤       ├──────────────┤       ├──────────────┤
│ id (PK)     │──┐    │ id (PK)      │──┐    │ id (PK)      │
│ email (UQ)  │  │    │ userId (FK)  │◄─┘    │ passageId(FK)│◄─┐
│ name        │  │    │ title        │       │ questionText │  │
│ supabaseAuth│  │    │ content      │       │ options (J)  │  │
│   Id (UQ)  │  │    │ simplifiedC  │       │ correctOpt   │  │
│ targetLevel │  │    │ originalLvl  │       │ sourceText   │  │
│ createdAt   │  │    │ simplifiedLv │       │ sourceLine   │  │
│ updatedAt   │  │    │ wordCount    │       │ explanation  │  │
└──────┬──────┘  │    │ sourceType   │       │ questionType │  │
       │         │    │ createdAt    │       │ difficulty   │  │
       │         │    │ updatedAt    │       │ createdAt    │  │
       │         │    └──────────────┘       └──────┬───────┘  │
       │         │                                   │          │
       │         │    ┌──────────────┐               │          │
       │         │    │  CardReview  │               │          │
       │         │    ├──────────────┤               │          │
       │         └───►│ id (PK)      │               │          │
       │              │ questionId(FK)│───────────────┘          │
       │              │ userId (FK)  │◄──────────────────────────┘
       │              │ qualityRating│
       │              │ easeFactor   │
       │              │ intervalDays │
       │              │ repetitions  │
       │              │ nextReviewDt │
       │              │ reviewedAt   │
       │              └──────────────┘
       │
       │         ┌──────────────┐
       └────────►│ StudySession │
                ├──────────────┤
                │ id (PK)      │
                │ userId (FK)  │
                │ passageId(FK)│
                │ startedAt    │
                │ completedAt  │
                │ cardsReviewed│
                │ accuracyRate │
                └──────────────┘
```

**Indexes:** `[userId, createdAt]` on Passage, `[userId, nextReviewDate]` on CardReview, `[userId, startedAt]` on StudySession

---

## Module Dependency Map

```
app/actions/analyze.ts (orchestrator)
├── lib/ai/cefr-detector.ts
│   └── ai SDK (@ai-sdk/openai)
├── lib/ai/content-simplifier.ts
│   └── ai SDK
├── lib/ai/question-generator.ts
│   └── ai SDK
└── lib/db-utils.ts
    └── lib/db/client.ts (Prisma client)

app/api/upload/route.ts
├── lib/validation/upload.ts
├── lib/parsers/pdf.ts
└── app/actions/analyze.ts

app/api/cards/review/route.ts
└── lib/db-utils.ts (calculateSM2Interval, updateCardReview)

app/api/cards/due/route.ts
└── lib/db-utils.ts (getDueCards)

app/api/progress/stats/route.ts
└── lib/db-utils.ts (getUserProgress)
```

---

## Monitoring & Observability

### Sentry Integration (Phase 01-03)
- **Package**: `@sentry/nextjs` integrated in server components
- **Configuration**: `sentry.server.config.ts` initializes Sentry with `isSentryEnabled()` check
- **Server Actions**: Wrapped with `Sentry.withServerActionInstrumentation()` in `analyze.ts`
- **API Routes**: Errors captured via `Sentry.captureException()` in upload, study-session, and cards/review routes
- **Breadcrumbs**: `Sentry.addBreadcrumb()` tracks AI calls and DB operations with category (`ai`, `db`, `upload`, `parse`) and level

### Log Forwarding (Phase 03)
- **Pino Integration**: `sentry.server.config.ts` uses `Sentry.pinoIntegration()` to forward Pino logs to Sentry
- **Log Levels**:
  - Error/Fatal Pino logs → Sentry errors (handled: true)
  - Warn/Error/Fatal Pino logs → Sentry logs
- **Logger**: `lib/core/logger.ts` uses Pino for structured logging with environment-based level (`LOG_LEVEL` env var, defaults: `debug` in dev, `info` in prod)

### Performance Monitoring (Phase 03)
- **Spans**: `Sentry.startSpan()` wraps key operations with `op: 'ai'` or `op: 'db'`:
  - **AI operations**: `ai:cefr-detect`, `ai:content-simplify`, `ai:question-gen`
  - **DB operations**: `db:user-lookup`, `db:passage-create`, `db:session-create`, `db:session-update`, `db:card-review-update`
  - **File operations**: `file-write`, `pdf-parse`

### Source Maps Upload (Phase 04)
- **Purpose**: Enable readable stack traces in Sentry for production debugging
- **Configuration**: `next.config.ts` with `withSentryConfig()`:
  - `authToken`: `process.env.SENTRY_AUTH_TOKEN` (CI only, kept secret)
  - `org`: `process.env.SENTRY_ORG || "pham-dac-luc"` (configurable via env)
  - `project`: `process.env.SENTRY_PROJECT || "javascript-nextjs"` (configurable via env)
  - `widenClientFileUpload`: `true` — uploads larger set of source maps for prettier traces
  - `tunnelRoute`: `"/monitoring"` — routes browser requests through Next.js rewrite to circumvent ad-blockers
  - `silent`: `!process.env.CI` — only print upload logs in CI
  - `webpack.treeshake.removeDebugLogging`: `true` — tree-shake Sentry logger for smaller bundle
  - `webpack.automaticVercelMonitors`: `true` — auto-instrument Vercel Cron Monitors
- **CI Setup**: Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and `CI=true` as CI secrets/environment variables (see `.env.example`)

---

## Rendering Strategy

| Page | Type | Data Fetching |
|------|------|--------------|
| `/` | Server Component | Static |
| `/sign-in` | Client Component | None (auth page, no sidebar) |
| `/sign-up` | Client Component | None (auth page, no sidebar) |
| `/auth/callback` | Route Handler | OAuth code exchange + user sync |
| `/upload` | Client Component | None |
| `/processing` | Client Component | None (simulated) |
| `/reading/[id]` | Server → Client | Server fetches passage, passes to client |
| `/test/[id]` | Server → Client | Server fetches passage+questions, passes to client |
| `/study` | Client Component (`force-dynamic`) | Three resizable panels (react-resizable-panels), no server data fetch |
| `/progress` | Server → Client | Server fetches stats, passes to client |
| `/study` | Server → Client | `force-dynamic`, client uses react-resizable-panels Group/Panel/Separator |

---

## Current Limitations

1. **Auth UI complete, demo user not yet replaced** - UserMenu, sign-out, and auth UI components active, but actions still use `getOrCreateDemoUser()` (Phase 04)
2. **Dashboard layout exists** - Navigation sidebar now implemented
3. **Simulated processing** - `/processing` fakes progress, doesn't poll real status
4. **No real-time updates** - No WebSockets or SSE
5. **SQLite only** - Single-file DB, no concurrent write handling beyond SQLite's built-in
6. **No caching** - AI calls not cached, DB queries not cached

---

**Status:** Active
**Last Updated:** 2026-05-07

---
**Note:** AI provider changed to OpenAI gpt-4o-mini, Supabase Auth added (email/password + Google OAuth), middleware route protection active, UserMenu and sign-out components implemented
