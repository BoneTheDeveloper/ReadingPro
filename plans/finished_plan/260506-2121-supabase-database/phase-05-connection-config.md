---
title: "Phase 05: Connection Config & Demo User Refactor"
description: "Configure Prisma client with pgBouncer connection pooling, consolidate demo user pattern, clean up SQLite artifacts"
status: pending
priority: P1
effort: 3h
branch: feature/supabase-database
---

## Context Links

- `src/lib/db/client.ts` — Prisma client singleton (currently SQLite adapter)
- `src/app/actions/study-shared.ts` — `getOrCreateDemoUser()` function
- `src/app/api/cards/due/route.ts` — inline demo user `upsert`
- `src/app/api/progress/stats/route.ts` — inline demo user `upsert`
- `src/app/api/study-session/route.ts` — inline demo user `findUnique + create`
- `prisma/schema.prisma` — datasource block (updated in Phase 02)
- Phase 02 — Prisma migration (schema already switched to PostgreSQL)

## Overview

Finalize the Prisma client configuration for Supabase PostgreSQL with pgBouncer connection pooling. Consolidate the duplicated demo user pattern across 4 files into a single shared utility. Remove all SQLite-related code and imports.

## Key Insights

### Connection Pooling

Supabase provides pgBouncer in transaction mode on port 6543. This is required for serverless/edge deployments where connections are short-lived.

**Connection string formats:**
- **Pooled (app queries):** `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
- **Direct (migrations):** `postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres`

**Prisma + pgBouncer gotchas:**
- Prisma 7.x supports pgBouncer via `@prisma/adapter-pg` or connection string `?pgbouncer=true`
- `prepared_statements` must be disabled for pgBouncer transaction mode
- `@prisma/adapter-pg` handles this automatically when configured

### Demo User Duplication

4 locations contain demo user logic:

| File | Pattern | Lines |
|------|---------|-------|
| `src/app/actions/study-shared.ts` | `getOrCreateDemoUser()` — clean utility | 9-17 |
| `src/app/api/cards/due/route.ts` | Inline `db.user.upsert({ where: { email: DEMO_USER_EMAIL } })` | 12-16 |
| `src/app/api/progress/stats/route.ts` | Inline `db.user.upsert({ where: { email: DEMO_USER_EMAIL } })` | 12-16 |
| `src/app/api/study-session/route.ts` | Inline `db.user.findUnique + create` (no upsert) | 14-19 |

The inline patterns are inconsistent:
- `due/route.ts` and `stats/route.ts` use `upsert`
- `study-session/route.ts` uses `findUnique` + manual `create` (race condition possible)
- `study-shared.ts` uses `findUnique` + manual `create` (same race condition)

**Fix:** Replace all 4 with `getOrCreateDemoUser()` from `study-shared.ts`, and improve it to use `upsert` for race-safety.

### Files to Clean Up

After this phase:
- No `better-sqlite3` references anywhere
- No `@prisma/adapter-better-sqlite3` references anywhere
- No `PrismaBetterSqlite3` import
- Single `getOrCreateDemoUser()` used everywhere
- Consistent demo user email constant

## Requirements

### Functional
- Prisma client connects via pgBouncer pooled connection
- Direct connection used for migrations
- Demo user lookup consolidated into single function
- All 4 demo user call sites use shared function

### Non-Functional
- Connection pool handles concurrent requests (pgBouncer transaction mode)
- Graceful connection error handling
- No SQLite artifacts in codebase

## Related Code Files

| File | Action |
|------|--------|
| `src/lib/db/client.ts` | Modify — full rewrite for PostgreSQL + pgBouncer |
| `src/app/actions/study-shared.ts` | Modify — improve to use `upsert`, add JSDoc |
| `src/app/api/cards/due/route.ts` | Modify — use `getOrCreateDemoUser()` |
| `src/app/api/progress/stats/route.ts` | Modify — use `getOrCreateDemoUser()` |
| `src/app/api/study-session/route.ts` | Modify — use `getOrCreateDemoUser()`, remove `DEMO_USER_EMAIL` constant |

## Implementation Steps

1. **Rewrite `src/lib/db/client.ts`**
   ```typescript
   import { PrismaClient } from '@prisma/client';
   import { PrismaPg } from '@prisma/adapter-pg';
   import pg from 'pg';

   const globalForPrisma = globalThis as unknown as {
     prisma: PrismaClient | undefined;
   };

   function createPrismaClient() {
     const pool = new pg.Pool({
       connectionString: process.env.DATABASE_URL,
       max: 10,
       idleTimeoutMillis: 20000,
       connectionTimeoutMillis: 10000,
     });

     const adapter = new PrismaPg(pool);
     return new PrismaClient({ adapter });
   }

   export const db = globalForPrisma.prisma ?? createPrismaClient();

   if (process.env.NODE_ENV !== 'production') {
     globalForPrisma.prisma = db;
   }
   ```

   **Note:** Evaluate if `@prisma/adapter-pg` is needed vs plain connection string. Prisma 7.x may handle pgBouncer natively with `?pgbouncer=true` in the URL. If native support works, simplify to:
   ```typescript
   export const db = globalForPrisma.prisma ?? new PrismaClient();
   ```
   Test both approaches during implementation.

2. **Improve `src/app/actions/study-shared.ts`**
   ```typescript
   import * as Sentry from '@sentry/nextjs';
   import { db } from '@/lib/db/client';
   import { createModuleLogger } from '@/lib/core/logger';

   const log = createModuleLogger('actions:study-shared');

   /** Demo user email for local dev — replaced by auth session in production */
   export const DEMO_USER_EMAIL = 'demo@example.com';

   /**
    * Get or create the demo user.
    * Uses upsert to avoid race conditions on concurrent first requests.
    * Will be replaced by auth-based user lookup when Issue #22 ships.
    */
   export async function getOrCreateDemoUser() {
     return Sentry.startSpan({ name: 'db:user-lookup', op: 'db' }, async () => {
       return db.user.upsert({
         where: { email: DEMO_USER_EMAIL },
         update: {},
         create: { email: DEMO_USER_EMAIL, name: 'Demo User' },
       });
     });
   }
   ```

3. **Update `src/app/api/cards/due/route.ts`**
   Replace inline `upsert`:
   ```typescript
   // REMOVE: const DEMO_USER_EMAIL = 'demo@example.com';
   // REMOVE: const user = await db.user.upsert({ ... });

   // ADD:
   import { getOrCreateDemoUser } from '@/app/actions/study-shared';
   // ...
   const user = await getOrCreateDemoUser();
   ```

   Also remove unused `db` import if `getOrCreateDemoUser` is the only DB usage (check: `getDueCards(user.id)` still needs `db` indirectly via utils).

4. **Update `src/app/api/progress/stats/route.ts`**
   Same pattern as above:
   ```typescript
   // REMOVE: const DEMO_USER_EMAIL = 'demo@example.com';
   // REMOVE: const user = await db.user.upsert({ ... });

   // ADD:
   import { getOrCreateDemoUser } from '@/app/actions/study-shared';
   // ...
   const user = await getOrCreateDemoUser();
   ```

5. **Update `src/app/api/study-session/route.ts`**
   Replace `findUnique + create` with `getOrCreateDemoUser()`:
   ```typescript
   // REMOVE: const DEMO_USER_EMAIL = 'demo@example.com';
   // REMOVE: let user = await db.user.findUnique({ ... });
   // REMOVE: if (!user) { user = await db.user.create({ ... }); }

   // ADD:
   import { getOrCreateDemoUser } from '@/app/actions/study-shared';
   // ...
   const user = await getOrCreateDemoUser();
   ```

6. **Verify no SQLite references remain**
   ```bash
   grep -r "better-sqlite3" --include="*.ts" --include="*.json" --include="*.prisma" .
   grep -r "PrismaBetterSqlite3" --include="*.ts" .
   grep -r "adapter-better-sqlite3" --include="*.ts" --include="*.json" .
   grep -r "sqlite" --include="*.prisma" .
   ```
   All should return no results.

7. **Verify no duplicate demo user patterns remain**
   ```bash
   grep -r "demo@example.com" --include="*.ts" .
   ```
   Should only appear in `src/app/actions/study-shared.ts`.

8. **Test compilation**
   ```bash
   npx prisma generate
   npm run build
   ```

## Todo List

- [ ] Rewrite `src/lib/db/client.ts` for PostgreSQL + pgBouncer
- [ ] Improve `getOrCreateDemoUser()` with `upsert`
- [ ] Update `src/app/api/cards/due/route.ts` — use shared function
- [ ] Update `src/app/api/progress/stats/route.ts` — use shared function
- [ ] Update `src/app/api/study-session/route.ts` — use shared function
- [ ] Remove all SQLite references
- [ ] Verify no duplicate demo user patterns
- [ ] Test compilation (`npm run build`)
- [ ] Test local dev (`npm run dev`)

## Success Criteria

- [ ] `src/lib/db/client.ts` uses `@prisma/adapter-pg` or direct PostgreSQL connection
- [ ] No `better-sqlite3`, `@prisma/adapter-better-sqlite3`, or `PrismaBetterSqlite3` in codebase
- [ ] `DEMO_USER_EMAIL` constant defined in exactly one file (`study-shared.ts`)
- [ ] All 4 API routes/actions use `getOrCreateDemoUser()`
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without database errors
- [ ] Connection pooling works (verify via Supabase Dashboard > Database > Connections)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `@prisma/adapter-pg` incompatible with Prisma 7.x | Medium | High | Test early; fallback to direct connection string |
| pgBouncer `prepared_statements` error | Medium | Medium | Adapter handles this; or add `?pgbouncer=true&prepared_statements=false` |
| Connection pool exhaustion under load | Low | Medium | pg.Pool `max: 10` with idle timeout; pgBouncer manages real PG connections |
| Demo user upsert race on first-ever request | Very Low | Low | `upsert` is atomic; SQLite had same race with `findUnique + create` |
| Import cycle from `study-shared.ts` | Very Low | Medium | `study-shared.ts` only imports `db` and `logger`; no circular deps |

## Security Considerations

- `DATABASE_URL` (pooled) contains credentials — stays in `.env.local`
- `DIRECT_URL` contains password — stays in `.env.local`
- `pg.Pool` configured with connection timeout to prevent hanging connections
- `getOrCreateDemoUser()` is a temporary pattern — clearly documented for removal when #22 ships

## Rollback Plan

1. Revert `src/lib/db/client.ts` to SQLite adapter version
2. Revert `study-shared.ts`, `due/route.ts`, `stats/route.ts`, `study-session/route.ts` to inline demo user patterns
3. Reinstall `@prisma/adapter-better-sqlite3` and `better-sqlite3`

## Next Steps

- Phase 06 (Testing) validates all CRUD operations against PostgreSQL
- Issue #22 integration will replace `getOrCreateDemoUser()` with auth-based user lookup
