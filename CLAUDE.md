# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered English reading comprehension trainer for non-native speakers. Pipeline: Upload text/PDF → AI detects CEFR level → Content simplified → Comprehension questions generated with source citations → SM-2 spaced repetition schedules reviews.

## Commands

```bash
npm run dev                # Start dev server
npm run build              # Production build (run before push)
npm run lint               # ESLint

# Database
npm run db:generate        # Regenerate Prisma client after schema changes
npm run db:migrate:dev     # Create & apply migration (interactive name prompt)
npm run db:migrate:deploy  # Apply migrations to production
npm run db:push            # Push schema without migration (dev only)
npm run db:studio          # Open Prisma Studio GUI

# Type checking
npx tsc --noEmit           # Check TypeScript without emitting
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, RSC) + React 19 + TypeScript (strict)
- **UI:** Tailwind CSS 4 + shadcn/ui (base-nova theme) + Lucide icons
- **AI:** Vercel AI SDK v6 + OpenAI gpt-4o-mini (`@ai-sdk/openai`)
- **Auth:** Supabase Auth (email/password + Google OAuth via `@supabase/ssr`)
- **Database:** PostgreSQL (Supabase) + Prisma v7.8 with `@prisma/adapter-pg`
- **Validation:** Zod v4
- **Logging:** Pino structured logging
- **Monitoring:** Sentry (server + edge configs)
- **PDF:** `pdf-parse`

## Architecture

### App Router Structure

```
src/app/
├── (auth)/           # Sign-in, sign-up pages (no auth required)
├── (dashboard)/      # All authenticated pages
│   ├── study/        # Three-panel resizable workspace (main feature)
│   ├── upload/       # File/text upload
│   ├── reading/[id]/ # Reading view
│   ├── test/[id]/    # Flashcard test
│   └── progress/     # Stats dashboard
├── actions/          # Server actions (orchestrators for AI pipeline)
├── api/              # REST endpoints (cards, sessions, upload, progress)
└── middleware.ts      # Auth route protection (Supabase SSR session)
```

### Key Modules

- `src/lib/db/` — Prisma client singleton + query files per model (passage, card-review, study-session)
- `src/lib/ai/` — AI service modules: `cefr-detector.ts`, `content-simplifier.ts`, `question-generator.ts`
- `src/lib/supabase/` — Auth clients: browser (`client.ts`), server (`server.ts`), middleware (`middleware.ts`)
- `src/lib/core/` — Logger (`logger.ts`), Sentry config (`sentry.ts`)
- `src/lib/algorithms/sm2.ts` — Standalone SM-2 spaced repetition implementation
- `src/components/ui/` — shadcn/ui primitives (never modify directly, compose instead)

### Data Flow (Study Page)

1. User uploads text/PDF → `study-upload-action.ts` → creates Passage → runs AI pipeline
2. AI pipeline: `analyze.ts` orchestrates CEFR detect → simplify → question generate
3. Each AI call uses Vercel AI SDK with Zod-structured output + Sentry spans
4. Questions stored in DB → served to quiz component → answers tracked via CardReview (SM-2)
5. Study sessions track activities via `study-session-queries.ts`

### Auth Pattern

- `src/app/middleware.ts` protects `/(dashboard)/*` routes
- Server components call `createClient()` from `src/lib/supabase/server.ts`
- Server actions call `getAuthenticatedUser()` from `src/lib/auth/auth-utils.ts`
- API routes validate auth via Supabase SSR session

### Database Client

`src/lib/db/client.ts` — Prisma singleton with PostgreSQL adapter. Import as `import { db } from '@/lib/db/client'`. Uses `PrismaPg` adapter with `DATABASE_URL` env var. `prisma.config.ts` uses `DIRECT_URL` for migrations.

## Conventions

- Server Components by default; `"use client"` only when state/effects needed
- Zod schemas at API/action boundaries for input validation
- API responses: `{ success: boolean, data?: T, error?: string }`
- Error handling: try/catch at route/action boundaries, Pino for server logs, Sentry for monitoring
- File naming: kebab-case for all non-Next-convention files (long descriptive names OK)
- Keep files under 200 lines; split when larger
- `cn()` from `@/lib/shared/utils` for conditional Tailwind classes

## Environment Variables

Required in `.env.local`:
- `OPENAI_API_KEY` — OpenAI API key
- `DATABASE_URL` — PostgreSQL connection string (Supabase pooled)
- `DIRECT_URL` — PostgreSQL direct connection (for Prisma migrations)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase admin access

## Plans & Documentation

- **Plans** go in `./plans/` directory — NEVER in `~/.claude/plans/`. Naming: `{date}-{issue}-{slug}/plan.md`
- **Docs** in `docs/` directory:
  - `docs/project-overview-pdr.md` — Product requirements
  - `docs/system-architecture.md` — Architecture diagrams and data flows
  - `docs/code-standards.md` — Coding conventions (detailed)
  - `docs/codebase-summary.md` — Directory structure and known issues
  - `docs/database/` — BRD, SRS, ERD, data dictionary, use cases
