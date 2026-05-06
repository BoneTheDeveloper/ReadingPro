---
title: "Supabase Database Migration Plan Report"
description: "Complete plan for GitHub issue #23 — SQLite to Supabase PostgreSQL migration"
status: completed
priority: P1
effort: 16h
branch: feature/supabase-database
tags: [database, migration, supabase, postgresql]
created: 2026-05-06
---

## Summary

Created 6-phase implementation plan for migrating from SQLite to Supabase PostgreSQL. Plan covers: project setup, Prisma schema migration, RLS policies, Storage migration, connection pooling, and validation.

## Plan Location

`/home/luc/Project/english-reading-training-app/plans/260506-2121-supabase-database/`

## Research Conducted

Read and analyzed all key files:
- `prisma/schema.prisma` — 5 models, 3 enums, 4 composite indexes, `@@map` naming
- `src/lib/db/client.ts` — SQLite adapter singleton (20 lines)
- `src/lib/db/utils.ts` — 12 CRUD functions, SM-2 algorithm (222 lines)
- `src/app/api/upload/route.ts` — local fs file writing (105 lines)
- `src/app/actions/study-upload-action.ts` — text upload action
- `src/app/actions/study-simplify-action.ts` — simplify action
- `src/app/actions/study-generate-questions-action.ts` — question gen with `$transaction`
- `src/app/actions/study-shared.ts` — demo user utility
- `src/app/api/cards/review/route.ts` — SM-2 review submission
- `src/app/api/cards/due/route.ts` — inline demo user upsert
- `src/app/api/progress/stats/route.ts` — inline demo user upsert
- `src/app/api/study-session/route.ts` — inline demo user find+create
- `src/app/api/upload/text/route.ts` — text upload route
- `src/lib/validation/upload.ts` — file/text validation
- `package.json` — deps including `@prisma/adapter-better-sqlite3`, `better-sqlite3`
- `.env.example` — current env vars
- `docs/system-architecture.md` — full architecture docs
- `docs/codebase-summary.md` — codebase overview

## Key Findings

1. **Schema is clean** — no SQLite-specific features. All types (CUID, DateTime, Json, enums) map directly to PostgreSQL.
2. **Demo user duplicated 4x** — `study-shared.ts`, `due/route.ts`, `stats/route.ts`, `study-session/route.ts`. Two use upsert, two use find+create (race condition).
3. **Upload route uses `fs/promises`** — writes to `process.cwd()/uploads/content/`. Must swap to Supabase Storage.
4. **`Passage.fileUrl` exists but never populated** — schema has the field, upload flow doesn't set it.
5. **Prisma 7.x + pgBouncer** — needs `@prisma/adapter-pg` or `?pgbouncer=true` for connection pooling.
6. **RLS blocked by #22** — can enable RLS with permissive policies pre-auth, tighten post-auth.

## Phase Overview

| Phase | File | Effort | Blocked By |
|-------|------|--------|------------|
| 01: Supabase Project Setup | `phase-01-supabase-project-setup.md` | 1h | none |
| 02: Prisma Migration | `phase-02-prisma-migration.md` | 3h | Phase 01 |
| 03: RLS Policies | `phase-03-rls-policies.md` | 4h | Phase 02, Issue #22 |
| 04: Storage Migration | `phase-04-storage-migration.md` | 3h | Phase 01 |
| 05: Connection Config | `phase-05-connection-config.md` | 3h | Phase 02 |
| 06: Testing & Validation | `phase-06-testing-validation.md` | 2h | Phase 04, 05 |

**Total: 16h**

## Dependency Graph

```
Phase 01 ──┬──> Phase 02 ──> Phase 05 ──┐
           │                            │
           └──> Phase 04 ──────────────┼──> Phase 06
                                        │
           Issue #22 ──> Phase 03 ──────┘
```

## File Ownership (No Conflicts)

| Phase | Files |
|-------|-------|
| 01 | `.env.example`, `.gitignore`, `supabase/config.toml`, `package.json` |
| 02 | `prisma/schema.prisma`, `src/lib/db/client.ts` (temp fix) |
| 03 | `supabase/migrations/*.sql` (new) |
| 04 | `src/app/api/upload/route.ts`, `src/lib/storage/supabase-storage.ts` (new) |
| 05 | `src/lib/db/client.ts` (full rewrite), `study-shared.ts`, 3 API routes |
| 06 | None (validation only) |

## Risks Highlighted

1. **pgBouncer + Prisma prepared statements** (Medium/High) — test early, use `@prisma/adapter-pg`
2. **RLS blocks server queries** (High/High) — service role key bypasses RLS
3. **UUID vs CUID mapping** (High/Medium) — deferred to #22 integration
4. **Demo user race condition** (Low/Low) — fixed in Phase 05 with `upsert`

## Unresolved Questions

1. **Prisma 7.x native pgBouncer support vs `@prisma/adapter-pg`?** — Need to test which approach works better. Plan includes both options in Phase 05.
2. **Storage bucket public vs private?** — Plan uses private with signed URLs. May want public for some content types.
3. **User ID mapping strategy when #22 ships?** — Supabase Auth uses UUIDs, schema uses CUIDs. Need to decide: add UUID column, use JWT claims, or switch PKs entirely.
4. **Local dev without Supabase?** — `supabase start` requires Docker. Is this acceptable for all devs, or should we support SQLite fallback?
