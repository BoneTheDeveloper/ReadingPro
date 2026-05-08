# Planner Report: Prisma Client Simplify

## Summary

Plan created for refactoring Prisma DB client setup. 6 phases, ~3h total effort. Strictly sequential dependency chain.

## What Was Analyzed

- `src/lib/db/client.ts` — current adapter+pool+dotenv pattern (48 lines -> target ~10 lines)
- `src/lib/db/user-scoped-client.ts` — Prisma extension to DELETE (64 lines)
- `src/lib/db/passage-queries.ts` — uses ScopedClient type (66 lines)
- `src/lib/db/card-review-queries.ts` — uses ScopedClient type (141 lines)
- `src/lib/db/study-session-queries.ts` — uses ScopedClient type (31 lines)
- 10 consumer files across API routes, server actions, server components
- `package.json` — deps to remove: `@prisma/adapter-pg`, `pg`, `@types/pg`, `dotenv`
- `.env.example` — 5 DB vars -> 2 (DATABASE_URL + DIRECT_URL)
- `prisma/SECURITY.md` — needs rewrite to reflect explicit userId model

## Phase Summary

| Phase | What | Effort | Risk |
|-------|------|--------|------|
| 1 | Create `prisma` DB user on Supabase (manual SQL) | 15m | Low |
| 2 | Simplify `client.ts` + env vars | 30m | Low |
| 3 | Delete `user-scoped-client.ts`, rewrite 3 query files | 45m | Medium |
| 4 | Update 10 consumer files | 45m | Medium |
| 5 | Remove unused deps + update docs | 15m | Low |
| 6 | Build + type-check + grep audit | 30m | Low |

## Key Risk: Missing userId Filter

The `user-scoped-client` extension auto-injected `userId` into all queries on Passage, CardReview, StudySession. Removing it means every call site must explicitly add `where: { userId }`. A missed filter exposes cross-user data.

**Mitigation**: Phase 6 includes grep audit. Code reviewer should verify all `db.*` calls include userId where applicable.

## File Impact

- **DELETE**: 1 file (`user-scoped-client.ts`)
- **MODIFY**: 15 files (client.ts, 3 query files, 10 consumers, .env.example, SECURITY.md)
- **CREATE**: 0 files (pure refactor)

## Unresolved Questions

1. **Prisma schema `directUrl`** — Need to verify current `schema.prisma` has (or needs) `directUrl` for migrations. If missing, Phase 2 adds it.
2. **`dotenv` usage outside client.ts** — Grep confirmed no other `dotenv` imports in `src/`. But scripts in `package.json` (e.g., `db:studio`) may rely on dotenv behavior. Prisma CLI reads `.env` natively so should be safe.
3. **Question model ownership** — `Question` has no `userId` column. Currently protected via passage ownership. After refactor, `study-generate-questions-action.ts` does `db.question.deleteMany({ where: { passageId } })` after verifying passage ownership. This is safe but worth a code-review check.

**Status:** DONE
**Summary:** Created 7-file implementation plan for Prisma client simplification. 6 sequential phases, ~3h effort. Key risk is missing userId filters after removing auto-scoping extension.
