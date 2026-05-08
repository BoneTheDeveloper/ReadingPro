---
title: "Phase 5: Remove unused deps + update .env.example + docs"
phase: 5
status: pending
effort: 15m
---

## Overview

Remove `@prisma/adapter-pg`, `pg`, `@types/pg`, and `dotenv` from dependencies. Update `.env.example`. Update `prisma/SECURITY.md`.

## Files

| Action | File |
|--------|------|
| MODIFY | `package.json` (via npm uninstall) |
| DELETE | `.env.example` old DB vars section |
| MODIFY | `.env.example` |
| MODIFY | `prisma/SECURITY.md` |

## Implementation

### 1. Remove npm packages

```bash
npm uninstall @prisma/adapter-pg pg @types/pg dotenv
```

This removes from both `dependencies` and `devDependencies`.

### 2. Update `.env.example`

Replace DB section:

```diff
-# Database (Pooled connection — recommended for app queries)
-# https://supabase.com/dashboard/project/_/settings/database
-DB_HOST=your-project.pooler.supabase.com
-DB_PORT=6543
-DB_USER=postgres.your-project-ref
-DB_PASSWORD=[YOUR-PASSWORD]
-DB_NAME=postgres
+# Database (Prisma — pooled connection via Supavisor)
+# Format: postgresql://prisma.[REF]:[PASSWORD]@[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
+DATABASE_URL="postgresql://prisma.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
+# Direct connection for migrations (no pooler)
+DIRECT_URL="postgresql://prisma.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

### 3. Update `prisma/SECURITY.md`

Rewrite to reflect new model:

```markdown
# Prisma & Supabase — Security Model

## Key Fact

Prisma connects via a dedicated `prisma` database user with `bypassrls`.
RLS policies exist as a safety net for direct DB access but do not apply to Prisma queries.

## Security Model

| Layer | Mechanism | Protects |
|-------|-----------|----------|
| Primary | Explicit `where: { userId }` on all queries | Every read/write scoped to authenticated user |
| Required | `getAuthenticatedUser()` before any DB call | Auth check must precede all DB operations |
| Secondary | Supabase RLS policies | Direct DB access via non-Prisma clients |

## Rules

1. **Always include `userId` in `where` clauses** for Passage, CardReview, StudySession queries
2. **Never skip `getAuthenticatedUser()`** — userId must come from auth, never from request body
3. **Verify ownership before update/delete** — fetch with userId, then mutate by id
4. **`db` is the single Prisma client** — import from `@/lib/db/client`
5. **Prisma is server-side only** — never expose to client components
6. **RLS stays enabled** — defense-in-depth for direct DB access
```

### 4. Verify `prisma/schema.prisma` has `directUrl`

Ensure datasource block includes:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

## Success Criteria

- [ ] `@prisma/adapter-pg`, `pg`, `@types/pg`, `dotenv` not in `package.json`
- [ ] `.env.example` has `DATABASE_URL` + `DIRECT_URL`, no `DB_*` vars
- [ ] `prisma/SECURITY.md` reflects explicit userId model

## Rollback

- `npm install @prisma/adapter-pg pg @types/pg dotenv`
- Restore `.env.example` and `prisma/SECURITY.md` from git
