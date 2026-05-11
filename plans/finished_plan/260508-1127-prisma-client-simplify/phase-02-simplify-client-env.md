---
title: "Phase 2: Simplify client.ts + update env vars"
phase: 2
status: pending
effort: 30m
---

## Overview

Replace `client.ts` with vanilla `PrismaClient()`. Remove adapter/Pool/dotenv imports. Remove `withUserContext` re-export.

## Files

| Action | File |
|--------|------|
| MODIFY | `src/lib/db/client.ts` |
| MODIFY | `.env.local` (local only) |

## Implementation

### `src/lib/db/client.ts` — replace entire contents:

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

Key changes:
- Remove `import { PrismaPg }` — no adapter
- Remove `import { Pool } from 'pg'` — no Pool
- Remove `import { config } from 'dotenv'` + `config()` call
- Remove `buildUrl()` helper function
- Remove `createPrismaClient()` function
- Remove `export { withUserContext }` re-export
- `new PrismaClient()` reads `DATABASE_URL` from env automatically

### `.env.local` — update vars

Replace:
```
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
```

With:
```
DATABASE_URL="postgresql://prisma.[REF]:[PW]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://prisma.[REF]:[PW]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### `prisma/schema.prisma` — add directUrl (if not present)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Success Criteria

- [ ] `client.ts` is 10 lines or fewer
- [ ] No imports from `@prisma/adapter-pg`, `pg`, or `dotenv`
- [ ] `db` exported as plain `PrismaClient` instance
- [ ] No `withUserContext` export from `client.ts`

## Rollback

- Restore original `client.ts` from git
- Restore old env vars in `.env.local`
