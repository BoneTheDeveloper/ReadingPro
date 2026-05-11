---
title: "Phase 1: Create prisma DB user on Supabase"
phase: 1
status: pending
effort: 15m
---

## Overview

Create a dedicated `prisma` database user on Supabase with `bypassrls` and full schema privileges. Update `DATABASE_URL` to use this user.

## Steps

1. Open Supabase Dashboard > SQL Editor
2. Run the following SQL:

```sql
-- Create prisma user with bypassrls (Prisma cannot work with RLS)
create user "prisma" with password 'YOUR_STRONG_PASSWORD' bypassrls createdb;

-- Grant postgres role membership (inherits all postgres permissions)
grant "prisma" to "postgres";

-- Schema-level grants
grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;

-- Default privileges for future objects
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

3. Construct `DATABASE_URL`:

```
postgresql://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
```

- Use **port 6543** (Supavisor pooler) for app queries
- Use **port 5432** for Prisma migrations (direct connection)
- Add `?pgbouncer=true` for pooled connection mode

4. Set `DATABASE_URL` in `.env.local`:

```
DATABASE_URL="postgresql://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
```

5. Set `DIRECT_URL` in `.env.local` for migrations:

```
DIRECT_URL="postgresql://prisma.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

6. Verify connection:

```bash
npx prisma db pull --print
```

## Success Criteria

- [ ] `prisma` user exists and can connect via pooler
- [ ] `prisma db pull` succeeds with new `DATABASE_URL`
- [ ] Old `DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT`/`DB_NAME` no longer needed

## Rollback

- Delete `prisma` user: `drop user "prisma";`
- Restore old env vars in `.env.local`
