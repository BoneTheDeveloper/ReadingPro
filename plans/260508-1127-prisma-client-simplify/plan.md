---
title: "Simplify Prisma DB Client Setup"
description: "Remove Prisma adapter-pg, user-scoped-client extension, dotenv; simplify to direct PrismaClient with DATABASE_URL and explicit userId in queries"
status: complete
priority: P1
effort: 3h
branch: main
tags: [prisma, supabase, refactor, security]
created: 2026-05-08
---

## Overview

Remove `@prisma/adapter-pg` + `pg.Pool` adapter pattern, `user-scoped-client.ts` extension, and `dotenv` explicit loading. Simplify to vanilla `PrismaClient()` with single `DATABASE_URL` env var. All queries use explicit `where: { userId }` instead of auto-scoping extension.

## Motivation

- Current adapter pattern is unnecessary complexity for Supabase pooled connections
- `PrismaClient()` natively supports `DATABASE_URL` — no Pool/adapter needed
- `withUserContext` extension hides security logic, making audits harder
- Explicit `where: { userId }` is transparent, debuggable, and matches standard Prisma patterns
- 5 separate DB env vars replaced by 1 `DATABASE_URL`

## Phases

| # | Phase | Status | Effort | File |
|---|-------|--------|--------|------|
| 1 | Create `prisma` DB user on Supabase | [x] | 15m | [phase-01-create-prisma-db-user.md](phase-01-create-prisma-db-user.md) |
| 2 | Simplify client.ts + update env vars | [x] | 30m | [phase-02-simplify-client-env.md](phase-02-simplify-client-env.md) |
| 3 | Remove user-scoped-client + update query files | [x] | 45m | [phase-03-remove-scoped-client-update-queries.md](phase-03-remove-scoped-client-update-queries.md) |
| 4 | Update all consumers | [x] | 45m | [phase-04-update-consumers.md](phase-04-update-consumers.md) |
| 5 | Remove unused deps + update .env.example + docs | [x] | 15m | [phase-05-cleanup-deps-docs.md](phase-05-cleanup-deps-docs.md) |
| 6 | Verify build + test | [x] | 30m | [phase-06-verify-build.md](phase-06-verify-build.md) |

## Dependency Graph

```
Phase 1 (Supabase user) ──> Phase 2 (client.ts + env)
Phase 2 ──> Phase 3 (remove scoped client + update queries)
Phase 3 ──> Phase 4 (update consumers)
Phase 4 ──> Phase 5 (cleanup deps + docs)
Phase 5 ──> Phase 6 (verify)
```

Phase 1 is manual (Supabase dashboard SQL). Phases 2-6 are code changes.

## Key Decisions (confirmed by user)

1. **Remove `user-scoped-client.ts`** — explicit `where: { userId }` in all queries
2. **Create dedicated `prisma` DB user** — with `bypassrls`, following Supabase docs
3. **`@prisma/adapter-pg` kept** — Prisma 7 mandates driver adapters, no standalone `PrismaClient()`
4. **Single `DATABASE_URL`** — replaced 5 separate env vars
5. **Remove `dotenv` call** — Next.js auto-loads `.env.local`
6. **RLS as safety net** — policies stay, but Prisma bypasses via `bypassrls`

## Deviation from Original Plan

- Originally planned to remove `@prisma/adapter-pg` + `pg` entirely. Prisma 7 architecture requires explicit driver adapters for SQL providers — built-in driver was removed. Kept adapter but simplified usage (direct `DATABASE_URL` string, no manual Pool config).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Missing `userId` filter on a query exposes cross-user data | Medium | Critical | Grep audit for all `db.*` calls; code review checklist |
| `DATABASE_URL` format mismatch with Supabase pooler | Low | High | Test connection before removing old env vars |
| `prisma` user lacks permissions for future migrations | Low | Medium | Grant `createdb` + all privileges on public schema |
| `dotenv` removal breaks non-Next.js scripts (prisma studio, etc.) | Low | Low | Prisma CLI reads `.env` natively; verify |

## Success Criteria

- [x] `npm run build` passes with zero errors
- [x] No import of `withUserContext`, `user-scoped-client`, or `dotenv` anywhere in src/
- [x] All DB queries include explicit `userId` in `where` clause (where applicable)
- [x] `.env.example` has `DATABASE_URL` + `DIRECT_URL` entries
- [x] `prisma/SECURITY.md` updated to reflect new model
