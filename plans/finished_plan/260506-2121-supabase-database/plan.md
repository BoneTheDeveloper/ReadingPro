---
title: "Migrate Database from SQLite to Supabase PostgreSQL"
description: "Replace SQLite + better-sqlite3 with Supabase PostgreSQL, add connection pooling, RLS policies, and migrate file uploads to Supabase Storage"
status: pending
priority: P1
effort: 16h
branch: feature/supabase-database
tags: [database, migration, supabase, postgresql, rls, storage]
created: 2026-05-06
---

## Issue

GitHub: https://github.com/BoneTheDeveloper/english-reading-training-app/issues/23

## Dependency

**BLOCKED by Issue #22 (Auth)**. RLS policies require authenticated user context (`auth.uid()`). Without auth, RLS has no principal to filter on. Phases 1-2 (Supabase setup + Prisma migration) can proceed independently, but Phase 3 (RLS) requires auth to be in place.

Strategy: Phases 1-2 unblocked immediately. Phase 3 stubs RLS policies that use a configurable user-ID fallback until auth ships. Phase 3 finalized when #22 merges.

## Research Findings

### Current State

| Aspect | Current | Target |
|--------|---------|--------|
| DB Engine | SQLite via `better-sqlite3` | Supabase PostgreSQL |
| ORM | Prisma 7.8 with `@prisma/adapter-better-sqlite3` | Prisma 7.8 with `@prisma/client` (native pg driver) |
| Schema | 5 models, 3 enums, 4 indexes | Same schema, native PG enums |
| File Storage | Local `uploads/content/` directory | Supabase Storage bucket |
| Auth | Hardcoded `demo@example.com` demo user | Supabase Auth (Issue #22) |
| Connection | Single-file, synchronous, in-process | Pooled via pgBouncer (transaction mode) |

### Schema Analysis

5 tables mapped via `@@map`:
- `users` — CUID PK, unique email, CEFR level default
- `passages` — FK to users, JSON `options` field in child, indexes on `[userId]`, `[createdAt]`
- `questions` — FK to passages, `options` stored as `Json` type
- `card_reviews` — unique composite `[questionId, userId]`, index `[userId, nextReviewDate]`
- `study_sessions` — FK to users, optional FK to passages, index `[userId, startedAt]`

3 native enums: `CEFRLevel`, `SourceType`, `QuestionType` — PostgreSQL supports native enums, no changes needed.

### DB Client (`src/lib/db/client.ts`)

Uses `@prisma/adapter-better-sqlite3` adapter. Singleton pattern with global cache. Must swap to standard Prisma client with `@prisma/adapter-pg` or direct connection string.

### CRUD Operations (`src/lib/db/utils.ts`)

222 lines, 12 exported functions. All use `db` from client.ts. No raw SQL. SM-2 algorithm inlined. Clean separation — no DB-layer changes needed beyond client swap.

### Upload Flow (`src/app/api/upload/route.ts`)

Writes files to `process.cwd()/uploads/content/`. Uses `fs/promises` (`writeFile`, `mkdir`). Must replace with Supabase Storage upload.

### Demo User Pattern

3 files duplicate the demo user lookup:
- `src/app/actions/study-shared.ts` — `getOrCreateDemoUser()`
- `src/app/api/cards/due/route.ts` — inline `upsert`
- `src/app/api/progress/stats/route.ts` — inline `upsert`
- `src/app/api/study-session/route.ts` — inline `findUnique + create`

Once auth exists, these all get replaced with session-based user lookup. Until then, keep demo user for local dev.

### Data Flow Impact

```
Server Actions ──> db (Prisma client) ──> SQLite file
API Routes ──────> db (Prisma client) ──> SQLite file
Upload Route ────> fs.writeFile ────────> uploads/content/

After migration:
Server Actions ──> db (Prisma client) ──> Supabase PostgreSQL (via pgBouncer)
API Routes ──────> db (Prisma client) ──> Supabase PostgreSQL (via pgBouncer)
Upload Route ────> supabase.storage ────> Supabase Storage bucket
```

## Phases

| Phase | Description | Status | Effort | Blocked By |
|-------|-------------|--------|--------|------------|
| [01](phase-01-supabase-project-setup.md) | Supabase project creation, env vars, CLI setup | pending | 1h | none |
| [02](phase-02-prisma-migration.md) | Switch Prisma to PostgreSQL, generate migration, apply to Supabase | pending | 3h | Phase 01 |
| [03](phase-03-rls-policies.md) | Row Level Security policies for all tables | pending | 4h | Phase 02, Issue #22 |
| [04](phase-04-storage-migration.md) | Move file uploads from local disk to Supabase Storage | pending | 3h | Phase 01 |
| [05](phase-05-connection-config.md) | Update Prisma client, connection pooling, env config, demo user refactor | pending | 3h | Phase 02 |
| [06](phase-06-testing-validation.md) | End-to-end validation of all CRUD, uploads, AI pipeline | pending | 2h | Phase 04, Phase 05 |

## Dependency Graph

```
Phase 01 (Supabase setup)
    ├──> Phase 02 (Prisma migration) ──> Phase 05 (Connection config) ──┐
    │                                       ^                              │
    │                                       │                              │
    └──> Phase 04 (Storage migration) ──────┘                              │
                                                                           │
    Issue #22 (Auth) ──> Phase 03 (RLS policies) ──> Phase 03 finalize    │
                                                                           │
                                              Phase 06 (Testing) <────────┘
```

- Phase 01 unblocks 02 + 04 in parallel
- Phase 03 blocked by Issue #22 (auth context needed for RLS)
- Phase 06 requires all prior phases complete

## File Ownership Per Phase

| Phase | Files Modified | Files Created | Files Deleted |
|-------|---------------|---------------|---------------|
| 01 | `.env.example`, `.env.local` | `supabase/config.toml` | none |
| 02 | `prisma/schema.prisma`, `package.json` | `prisma/migrations/**` | none |
| 03 | none (SQL policies via Supabase CLI) | `supabase/migrations/*.sql` | none |
| 04 | `src/app/api/upload/route.ts`, `src/app/actions/study-upload-action.ts`, `src/lib/validation/upload.ts` | `src/lib/storage/supabase-storage.ts` | none |
| 05 | `src/lib/db/client.ts`, `src/app/actions/study-shared.ts`, `src/app/api/cards/due/route.ts`, `src/app/api/progress/stats/route.ts`, `src/app/api/study-session/route.ts` | none | none |
| 06 | none | test files | none |

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Prisma 7.8 + Supabase connection pooling incompatibility | Medium | High | Test pgBouncer transaction mode early; use direct connection for migrations |
| SQLite `Json` type differences with PostgreSQL `jsonb` | Low | Medium | Prisma handles this; verify `options` field round-trips correctly |
| RLS blocks server-side Prisma queries | High | High | Use service role key for Prisma, anon key for client-side; Phase 03 covers this |
| Storage upload latency (vs local fs) | Low | Low | Supabase Storage is same-region; negligible latency |
| Demo user pattern breaks during migration | Medium | Medium | Phase 05 consolidates demo user into single shared utility |
| `@prisma/adapter-pg` vs direct connection string | Medium | Medium | Evaluate both; direct string simpler for serverless |

## Rollback Plan

- Phase 01: Delete Supabase project (no code changes)
- Phase 02: Revert `prisma/schema.prisma`, `package.json`. SQLite migration still in git history.
- Phase 03: Disable RLS policies via SQL (`ALTER TABLE ... DISABLE ROW LEVEL SECURITY`)
- Phase 04: Revert upload route changes; local `uploads/` still works if kept
- Phase 05: Revert `src/lib/db/client.ts`; restore SQLite adapter
- Phase 06: No code changes to roll back

## Success Criteria

- [ ] All 5 tables created in Supabase with correct schema, indexes, constraints
- [ ] All 3 enums (CEFRLevel, SourceType, QuestionType) created as PostgreSQL enums
- [ ] Prisma client connects to Supabase via connection pooler
- [ ] All 12 CRUD functions in `db/utils.ts` work against PostgreSQL
- [ ] File uploads stored in Supabase Storage, not local disk
- [ ] RLS policies enforce user data isolation on all tables
- [ ] Demo user flow works for local dev without auth
- [ ] AI pipeline (CEFR detect, simplify, question gen) works end-to-end
- [ ] No `better-sqlite3` or `@prisma/adapter-better-sqlite3` in dependencies
- [ ] Connection pooling configured for serverless (pgBouncer transaction mode)
