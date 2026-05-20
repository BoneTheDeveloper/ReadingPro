## Project Overview

AI-powered English reading comprehension trainer for non-native speakers. Upload text/PDF → AI detects CEFR level → Content simplified → Comprehension questions with source citations → SM-2 spaced repetition schedules reviews.


## Plans & Documentation

- **Plans:** `./plans/` — naming: `{date}-{issue}-{slug}/plan.md`
- **Docs:** `docs/` — `project-overview-pdr.md`, `system-architecture.md`, `code-standards.md`, `styling-guide.md`, `codebase-summary.md`, `database/`

## Codebase Navigation (GKG MCP) — MANDATORY

Use GKG tools FIRST for ALL code navigation. Always re-index before using GKG. Fallback to Read/Glob/Grep only if GKG fails (state why).

Re-index: `index_project` with `project_absolute_path: "/home/luc/Project/english-reading-training-app"`

## Conventions

- Startup: read `docs/codebase-summary.md` first every session before navigating or editing, then use GKG MCP for relation checks.
- Architecture & data flow: see `docs/system-architecture.md` after `docs/codebase-summary.md` for full details.
- Code standards: see `docs/code-standards.md` — TS rules, file naming, project structure, components, API responses, error handling, Prisma patterns
- Commands: see `package.json` scripts; `pnpm tsc --noEmit` for type check

##  Library access
Do not read node_modules by default.

When library API/type information is needed, first inspect package.json and the lockfile to identify the installed package version.

If local package source or .d.ts files are needed, request permission to read only the specific package path, for example:
- node_modules/ai/**
- node_modules/@ai-sdk/**
- node_modules/react-resizable-panels/**

Never request access to the entire node_modules directory unless explicitly justified.
Prefer reading .d.ts files, package exports, and dist entrypoints only.
## Prisma Migrations

```
Never edit an applied migration — Prisma hashes content, editing will cause errors
Never delete the migrations/ folder — required for migrate deploy and team sync
Always commit migrations/ to git
Schema change → always create a new migration, never modify old ones
Manually edit migration.sql only for: renaming columns, migrating existing data, or custom SQL (indexes, triggers)
Always review .sql files before applying, especially on production
