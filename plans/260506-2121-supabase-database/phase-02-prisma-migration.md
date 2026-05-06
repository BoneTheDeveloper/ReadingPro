---
title: "Phase 02: Prisma Migration to PostgreSQL"
description: "Switch Prisma datasource from SQLite to PostgreSQL, generate migration SQL, apply to Supabase"
status: pending
priority: P1
effort: 3h
branch: feature/supabase-database
---

## Context Links

- `prisma/schema.prisma` — current schema with SQLite datasource
- `src/lib/db/client.ts` — Prisma client with `@prisma/adapter-better-sqlite3`
- `package.json` — current deps: `@prisma/adapter-better-sqlite3`, `better-sqlite3`
- Phase 01 — Supabase project setup (env vars, connection strings)

## Overview

Switch Prisma's datasource from SQLite to PostgreSQL. Remove `@prisma/adapter-better-sqlite3`. Generate a migration from the existing schema and apply it to the Supabase PostgreSQL instance. No schema model changes — pure engine swap.

## Key Insights

### Schema Compatibility

- All 5 models (`User`, `Passage`, `Question`, `CardReview`, `StudySession`) are standard relational — no SQLite-specific features
- 3 enums (`CEFRLevel`, `SourceType`, `QuestionType`) — PostgreSQL supports native enums natively
- `Json` type on `Question.options` — Prisma maps this to `jsonb` on PostgreSQL automatically
- `@default(cuid())` — works identically on PostgreSQL
- `@updatedAt` — works identically on PostgreSQL
- `@@map("table_name")` — table names already plural/snake_case, no rename needed
- `@@index` — all indexes are standard, will translate directly

### Client Adapter Change

Current client uses `@prisma/adapter-better-sqlite3`:
```typescript
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
const adapter = new PrismaBetterSqlite3({ url: ... });
new PrismaClient({ adapter });
```

For PostgreSQL with Prisma 7.x, two options:
1. **Direct connection string** — no adapter needed, Prisma uses built-in pg driver
2. **`@prisma/adapter-pg`** — for pgBouncer compatibility

**Decision: Use direct connection string with `@prisma/adapter-pg` for pgBouncer transaction mode.** This is required for Supabase serverless connection pooling.

### Migration Strategy

Two connection strings needed:
- `DIRECT_URL` — direct connection (port 5432) for `prisma migrate deploy`
- `DATABASE_URL` — pooled connection (port 6543) for runtime queries

## Requirements

### Functional
- Prisma schema datasource changed to PostgreSQL
- Migration generated and applied to Supabase
- All 5 tables created with correct columns, types, constraints
- All 3 enums created as PostgreSQL native enums
- All indexes created (`@@index` directives)

### Non-Functional
- Migration is reversible (down-migration generated)
- No data loss — existing SQLite data can be exported/imported later
- Prisma client generates correctly with new datasource

## Related Code Files

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Modify — datasource provider, connection string |
| `src/lib/db/client.ts` | Modify — swap adapter (deferred to Phase 05) |
| `package.json` | Modify — remove SQLite deps, add pg deps |

## Implementation Steps

1. **Remove SQLite dependencies**
   ```bash
   npm uninstall @prisma/adapter-better-sqlite3 better-sqlite3
   npm install @prisma/adapter-pg pg
   npm install -D @types/pg
   ```

2. **Update `prisma/schema.prisma` datasource**
   ```prisma
   datasource db {
     provider  = "postgresql"
     url       = env("DATABASE_URL")
     directUrl = env("DIRECT_URL")
   }
   ```
   - `url` — pooled connection for runtime queries
   - `directUrl` — direct connection for migrations and introspection

3. **Verify schema is PostgreSQL-compatible**
   - No changes needed to models — all types map cleanly
   - Enums remain as-is — Prisma generates PostgreSQL `CREATE TYPE` statements
   - `Json` type auto-maps to `jsonb`

4. **Generate initial migration**
   ```bash
   npx prisma migrate dev --name init_supabase_postgresql
   ```
   This creates `prisma/migrations/YYYYMMDDHHMMSS_init_supabase_postgresql/migration.sql`.

5. **Review generated migration SQL**
   Verify it contains:
   - `CREATE TYPE "CEFRLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');`
   - `CREATE TYPE "SourceType" AS ENUM ('TEXT', 'PDF');`
   - `CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'TRUE_FALSE');`
   - `CREATE TABLE "users" (...)` with all columns
   - `CREATE TABLE "passages" (...)` with FK, indexes
   - `CREATE TABLE "questions" (...)` with FK, indexes
   - `CREATE TABLE "card_reviews" (...)` with composite unique, FK, indexes
   - `CREATE TABLE "study_sessions" (...)` with FK, indexes

6. **Apply migration to Supabase**
   ```bash
   npx prisma migrate deploy
   ```
   Uses `DIRECT_URL` for direct connection.

7. **Verify in Supabase Dashboard**
   - Go to Table Editor — confirm all 5 tables visible
   - Go to Database > Extensions — confirm `uuid-ossp` or equivalent for CUID generation
   - Spot-check column types (especially `jsonb` for `options`)

8. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

9. **Temporary client fix for dev**
   Update `src/lib/db/client.ts` minimally to allow compilation while Phase 05 does the full rewrite:
   ```typescript
   import { PrismaClient } from '@prisma/client';

   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
   };

   export const db = globalForPrisma.prisma ?? new PrismaClient();

   if (process.env.NODE_ENV !== 'production') {
     globalForPrisma.prisma = db;
   }
   ```
   Note: Full connection pooling config deferred to Phase 05.

## Todo List

- [ ] Uninstall `@prisma/adapter-better-sqlite3` and `better-sqlite3`
- [ ] Install `@prisma/adapter-pg`, `pg`, `@types/pg`
- [ ] Update `prisma/schema.prisma` datasource block
- [ ] Run `prisma migrate dev --name init_supabase_postgresql`
- [ ] Review generated SQL migration
- [ ] Run `prisma migrate deploy` against Supabase
- [ ] Verify tables in Supabase Dashboard
- [ ] Run `prisma generate`
- [ ] Temporarily update `src/lib/db/client.ts` to compile

## Success Criteria

- [ ] `prisma migrate status` shows migration applied
- [ ] 5 tables visible in Supabase Table Editor: `users`, `passages`, `questions`, `card_reviews`, `study_sessions`
- [ ] 3 enum types visible in Supabase Database > Enums
- [ ] All FK constraints present (check via `\d+ tablename` in SQL editor)
- [ ] All indexes present (`users_email_unique`, `passages_userId_idx`, `passages_createdAt_idx`, `questions_passageId_idx`, `card_reviews_questionId_userId_unique`, `card_reviews_userId_nextReviewDate_idx`, `study_sessions_userId_startedAt_idx`)
- [ ] `prisma generate` succeeds without errors
- [ ] `package.json` has no `better-sqlite3` or `@prisma/adapter-better-sqlite3` references
- [ ] `src/lib/db/client.ts` compiles (minimal fix)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| pgBouncer `prepared_statements` conflict with Prisma | Medium | High | Set `pgbouncer=true` in connection string or use `@prisma/adapter-pg` |
| Enum migration fails on Supabase | Low | Medium | Prisma handles enum creation; test in local Supabase first |
| `jsonb` vs `Json` type mismatch | Very Low | Low | Prisma abstracts this; verify `options` field read/write |
| Direct URL auth fails (Supabase connection string format) | Medium | High | Verify connection string format from Supabase dashboard > Settings > Database |

## Security Considerations

- `DIRECT_URL` contains database password — must stay in `.env.local`
- Migration runs with full DB owner privileges — ensure only used in controlled environments
- Prisma `db push` should be avoided in production — always use `migrate deploy`

## Rollback Plan

1. Revert `prisma/schema.prisma` to SQLite datasource
2. Reinstall `@prisma/adapter-better-sqlite3` and `better-sqlite3`
3. Drop tables in Supabase via SQL: `DROP TABLE IF EXISTS ... CASCADE;`
4. Delete `prisma/migrations/YYYYMMDD...init_supabase_postgresql/`
5. Revert `src/lib/db/client.ts`

## Next Steps

- Unblocks Phase 03 (RLS policies — requires tables exist)
- Unblocks Phase 05 (connection config — requires schema migrated)
