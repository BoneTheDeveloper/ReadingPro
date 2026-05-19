# Codebase Summary

**English Reading Training App**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router, RSC) |
| UI | React 19.2.6, shadcn/ui, Tailwind CSS 4 |
| AI | Vercel AI SDK v6 + OpenAI/Google providers (`@ai-sdk/openai`, `@ai-sdk/google`) |
| Auth | Supabase Auth (`@supabase/supabase-js` + `@supabase/ssr`) |
| Database | PostgreSQL (Supabase) + Prisma ORM v7.8 (`@prisma/adapter-pg`) |
| Storage | Supabase Storage (file uploads) |
| PDF | `pdf-parse` v2.4.5 |
| Validation | Zod v4 |
| File Upload | `react-dropzone` v15 |
| Panel Layout | `react-resizable-panels` v4 |
| Icons | Lucide React |
| Monitoring | Sentry (server + edge configs) |
| Logging | Pino structured logging |
| TypeScript | Strict mode |

---

## Directory Structure

The codebase now separates routing from feature implementation:

- `src/app/` contains route entrypoints and API route handlers.
- `src/features/<name>/` contains feature-specific UI, types, server actions, and workflow logic.
- `src/components/ui/` contains reusable UI primitives.
- `src/components/layout/` contains dashboard shell and account controls.
- `src/lib/` contains cross-feature infrastructure and reusable domain utilities.

```
src/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── layout.tsx                        # Root layout (Geist fonts)
│   ├── globals.css                       # Tailwind + shadcn theme
│   ├── api/
│   │   ├── upload/route.ts               # POST: file upload + analyze
│   │   ├── upload/text/route.ts          # POST: text content + analyze
│   │   ├── cards/review/route.ts         # POST: submit SM-2 card review
│   │   ├── cards/due/route.ts            # GET: fetch due cards
│   │   ├── study-session/route.ts        # POST+PATCH: session CRUD
│   │   ├── progress/stats/route.ts       # GET: user progress stats
│   │   └── sentry-example-api/route.ts   # Sentry test endpoint
│   ├── (auth)/
│   │   ├── layout.tsx                    # Auth pages centered layout
│   │   ├── sign-in/page.tsx              # Email/password + Google OAuth
│   │   └── sign-up/page.tsx              # Email/password + Google OAuth
│   ├── auth/callback/route.ts            # OAuth callback handler
│   └── (dashboard)/
│       ├── layout.tsx                    # Dashboard layout (sidebar)
│       ├── error.tsx                     # Dashboard error boundary
│       ├── upload/page.tsx               # Thin route: renders upload feature client
│       ├── progress/page.tsx             # Thin route: renders progress feature
│       ├── processing/page.tsx           # Thin route: renders processing feature client
│       ├── reading/[id]/                 # Server route: loads passage, renders reading feature
│       ├── test/[id]/                    # Server route: loads questions, renders test feature
│       └── study/                        # Server route + error boundary for study workspace
├── components/
│   ├── ui/                               # shadcn/ui primitives (don't modify)
│   ├── layout/                           # Dashboard shell and account controls
│   │   ├── dashboard-sidebar.tsx         # Dashboard navigation/sidebar/top bar
│   │   ├── user-menu.tsx                 # User dropdown menu
│   │   ├── sign-out-button.tsx           # Sign-out icon button
│   │   └── use-sign-out.ts               # Layout-owned sign-out hook
│   └── error-boundary.tsx                # Global error boundary
├── features/
│   ├── study/
│   │   ├── study-page-client.tsx         # Main 3-panel workspace composition
│   │   ├── study-*.tsx                   # Study panels, quiz UI, upload modal
│   │   ├── use-study-*.ts                # Workspace state, layout, and actions
│   │   ├── actions/                      # Server action adapters
│   │   ├── services/                     # Study business workflows
│   │   └── study-types.ts                # Study feature types
│   ├── upload/
│   │   ├── upload-*.tsx                  # Upload and processing UI
│   │   ├── text-input-area.tsx           # Text paste input
│   │   ├── *workflow.ts                  # Upload orchestration
│   │   ├── *service.ts                   # Content analysis business logic
│   │   └── analyze-content-action.ts     # Server action adapter
│   ├── reading/
│   │   └── reading-view-client.tsx       # Reading view with original/simplified toggle
│   ├── test/
│   │   ├── flashcard-test-client.tsx     # Flashcard test state and flow
│   │   ├── test-types.ts                 # Test data types
│   │   ├── test-header.tsx               # Test header with progress
│   │   ├── test-passage-panel.tsx        # Passage display panel
│   │   ├── test-question-card.tsx        # Question card UI
│   │   └── test-results-screen.tsx       # Results summary screen
│   └── progress/
│       └── progress-dashboard.tsx        # Progress stats display
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     # Browser client
│   │   ├── server.ts                     # Server client (component + action)
│   │   └── middleware.ts                 # Session management
│   ├── auth/
│   │   ├── auth-utils.ts                 # getAuthenticatedUser, requireAuth, ensureProfile
│   │   └── sync-user.ts                  # Upsert user profile on OAuth
│   ├── db/
│   │   ├── client.ts                     # Prisma singleton + PrismaPg + security extension
│   │   ├── passage-queries.ts            # Passage CRUD + question creation
│   │   ├── card-review-queries.ts        # SM-2 logic, due cards, progress stats
│   │   └── study-session-queries.ts      # Session CRUD + accuracy computation
│   ├── storage/
│   │   └── supabase-storage.ts           # File upload/download/delete via Supabase Storage
│   ├── shared/
│   │   ├── utils.ts                      # cn() utility
│   │   └── reading-utils.ts              # Reading time, word highlighting
│   ├── domain/                           # Cross-feature domain helpers
│   ├── ui/                               # Cross-feature UI helpers
│   ├── parsers/
│   │   └── pdf.ts                        # PDF text extraction
│   ├── validation/
│   │   └── upload.ts                     # File/text validation
│   ├── algorithms/
│   │   └── sm2.ts                        # SM-2 standalone implementation
│   ├── core/
│   │   ├── logger.ts                     # Pino structured logging
│   │   └── sentry.ts                     # Sentry client configuration
│   └── ai/
│       ├── content-simplifier.ts         # AI text simplification
│       ├── question-generator.ts         # AI question generation
│       └── prompt-utils.ts               # Text wrapping helpers for AI prompts
├── generated/prisma/                     # Generated Prisma client
├── instrumentation.ts                    # Sentry server instrumentation
├── instrumentation-client.ts             # Sentry client instrumentation
└── proxy.ts                              # Auth route protection and redirects
```

---

## Pages

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/sign-in` | Email/password + Google OAuth sign-in |
| `/sign-up` | Email/password + Google OAuth sign-up |
| `/auth/callback` | OAuth callback handler |
| `/upload` | File upload or text paste |
| `/processing` | Simulated processing animation |
| `/reading/[id]` | Reading view with original/simplified toggle |
| `/test/[id]` | Flashcard test with feedback and scoring |
| `/study` | Three-panel resizable workspace |
| `/progress` | Progress dashboard with stats |

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase pooled) |
| `DIRECT_URL` | PostgreSQL direct connection (Prisma migrations) |
| `OPENAI_API_KEY` | OpenAI API key (required) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase admin access |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) |
| `SENTRY_ORG` | Sentry organization (optional) |
| `SENTRY_PROJECT` | Sentry project name (optional) |

---

## Known Issues

- Processing page is simulated (fake progress, auto-redirects after ~6s)
- No real-time updates (no WebSockets/SSE)
- No caching on AI calls or DB queries
- Unused deps pending audit: `react-hook-form`, `@hookform/resolvers`, `date-fns`, `@base-ui/react`

---

**See also:**
- Data models → [`docs/database/data-dictionary.md`](database/data-dictionary.md)
- API endpoints & requirements → [`docs/database/srs.md`](database/srs.md)
- ERD → [`docs/database/erd.md`](database/erd.md)

---

**Status:** Active
**Last Updated:** 2026-05-19
