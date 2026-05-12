# CLAUDE.md

## Project Overview

AI-powered English reading comprehension trainer for non-native speakers. Upload text/PDF → AI detects CEFR level → Content simplified → Comprehension questions with source citations → SM-2 spaced repetition schedules reviews.

## Plans & Documentation

- **Plans:** `./plans/` — naming: `{date}-{issue}-{slug}/plan.md`
- **Docs:** `docs/` — `project-overview-pdr.md`, `system-architecture.md`, `code-standards.md`, `codebase-summary.md`, `database/`

## Codebase Navigation (GKG MCP) — MANDATORY

Use GKG tools FIRST for ALL code navigation. Fallback to Read/Glob/Grep only if GKG fails (state why).

1. `search_codebase_definitions` → find definitions
2. `read_definitions` → read implementations
3. `get_definition` → go-to-definition
4. `get_references` → find usages
5. `repo_map` → directory structure
6. `import_usage` → analyze imports

Re-index: `index_project` with `project_absolute_path: "/home/luc/Project/english-reading-training-app"`

## Commands

```bash
npm run dev                # Dev server
npm run build              # Production build (run before push)
npm run lint               # ESLint
npx tsc --noEmit           # Type check
npm run db:generate        # Regenerate Prisma client
npm run db:migrate:dev     # Create & apply migration
npm run db:migrate:deploy  # Apply migrations to production
npm run db:push            # Push schema (dev only)
npm run db:studio          # Prisma Studio GUI
```

## Tech Stack

Next.js 16 (App Router, RSC) + React 19 + TypeScript (strict) | Tailwind CSS 4 + shadcn/ui + Lucide | Vercel AI SDK v6 + OpenAI gpt-4o-mini | Supabase Auth (email/password + Google OAuth) | PostgreSQL (Supabase) + Prisma v7.8 (`@prisma/adapter-pg`) | Zod v4 | Pino | Sentry | `pdf-parse`

## Architecture

```
src/app/
├── (auth)/           # Sign-in, sign-up
├── (dashboard)/      # Authenticated pages: study/, upload/, reading/[id]/, test/[id]/, progress/
├── actions/          # Server actions (AI pipeline orchestrators)
├── api/              # REST endpoints (cards, sessions, upload, progress)
└── middleware.ts      # Auth route protection
```

**Key modules:** `src/lib/db/` (Prisma + queries), `src/lib/ai/` (CEFR detect, simplifier, question gen), `src/lib/supabase/` (auth clients), `src/lib/core/` (logger, Sentry), `src/lib/algorithms/sm2.ts`, `src/components/ui/` (shadcn primitives — compose, don't modify)

**Data flow:** Upload → `study-upload-action.ts` → Passage → `analyze.ts` pipeline (CEFR → simplify → questions) → DB → quiz → CardReview (SM-2) → study sessions

**Auth:** `middleware.ts` protects `/(dashboard)/*` | Server components: `createClient()` from `src/lib/supabase/server.ts` | Server actions: `getAuthenticatedUser()` from `src/lib/auth/auth-utils.ts` | API routes: Supabase SSR session

**DB client:** `import { db } from '@/lib/db/client'` — Prisma singleton with `PrismaPg` adapter (`DATABASE_URL`). Migrations use `DIRECT_URL` via `prisma.config.ts`.

## Prisma Migrations

```
Never edit an applied migration — Prisma hashes content, editing will cause errors
Never delete the migrations/ folder — required for migrate deploy and team sync
Always commit migrations/ to git
Schema change → always create a new migration, never modify old ones
Manually edit migration.sql only for: renaming columns, migrating existing data, or custom SQL (indexes, triggers)
Always review .sql files before applying, especially on production
```

```bash
npx prisma migrate dev --name describe_change   # local
npx prisma migrate deploy                        # production
```

## Conventions

- Server Components by default; `"use client"` only when state/effects needed
- Zod schemas at API/action boundaries
- API responses: `{ success: boolean, data?: T, error?: string }`
- Error handling: try/catch at boundaries, Pino logs, Sentry monitoring
- File naming: kebab-case (long descriptive names OK)
- Files under 200 lines; split when larger
- `cn()` from `@/lib/shared/utils` for conditional classes

### Styling

Full rules: `docs/code-standards.md`. Token values: `src/app/globals.css` `:root`.

**FORBIDDEN:** `bg-primary-600`, `bg-neutral-*`, `text-primary-700`, hardcoded hex, `style={{ color: "#" }}` for static values, raw `<button>`/`<input>`/`<textarea>`, inline SVGs, `onMouseEnter`/`onMouseLeave`.

**USE:** Theme tokens (`bg-primary`, `bg-muted`, `text-muted-foreground`, `border-border`), shadcn primitives, `cn()`.

**Exceptions:** Dynamic inline styles (progress widths), error-boundary raw buttons.

## Environment Variables

`OPENAI_API_KEY` | `DATABASE_URL` (pooled) | `DIRECT_URL` (migrations) | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `SUPABASE_SERVICE_ROLE_KEY`
