## Project Overview

AI-powered English reading comprehension trainer for non-native speakers. Upload text/PDF → AI detects CEFR level → Content simplified → Comprehension questions with source citations → SM-2 spaced repetition schedules reviews.


## Plans & Documentation

- **Plans:** `./plans/` — naming: `{date}-{issue}-{slug}/plan.md`
- **Docs:** `docs/` — `project-overview-pdr.md`, `system-architecture.md`, `code-standards.md`, `styling-guide.md`, `codebase-summary.md`, `database/`

## Codebase Navigation (GKG MCP) — MANDATORY

Use GKG tools FIRST for ALL code navigation. Fallback to Read/Glob/Grep only if GKG fails (state why).

Re-index: `index_project` with `project_absolute_path: "/home/luc/Project/english-reading-training-app"`

## Architecture & Data Flow

See `docs/system-architecture.md` for full details.

```

## Conventions

- Code standards: see `docs/code-standards.md` — TS rules, file naming, project structure, components, API responses, error handling, Prisma patterns
- Styling: see `docs/styling-guide.md` — theme tokens, forbidden patterns, shadcn rules
- Commands: see `package.json` scripts; `pnpm tsc --noEmit` for type check

## Prisma Migrations

```
Never edit an applied migration — Prisma hashes content, editing will cause errors
Never delete the migrations/ folder — required for migrate deploy and team sync
Always commit migrations/ to git
Schema change → always create a new migration, never modify old ones
Manually edit migration.sql only for: renaming columns, migrating existing data, or custom SQL (indexes, triggers)
Always review .sql files before applying, especially on production
