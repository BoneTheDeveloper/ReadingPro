---
title: "Phase 03: Row Level Security Policies"
description: "Implement RLS policies on all 5 tables for user data isolation, with auth context from Issue #22"
status: pending
priority: P1
effort: 4h
branch: feature/supabase-database
---

## Context Links

- Issue #22 — Auth implementation (BLOCKER)
- `prisma/schema.prisma` — all 5 models with `userId` FK relationships
- `src/app/actions/study-shared.ts` — current demo user pattern
- `src/app/api/cards/due/route.ts` — inline demo user upsert
- `src/app/api/progress/stats/route.ts` — inline demo user upsert
- `src/app/api/study-session/route.ts` — inline demo user lookup
- Phase 02 — Prisma migration (tables must exist)

## Overview

Enable Row Level Security on all 5 tables. Define policies that restrict each user to their own data. This phase has two stages:

**Stage A (Pre-Auth):** Enable RLS with service-role bypass for server-side Prisma queries. App continues to work with demo user. No auth dependency.

**Stage B (Post-Auth #22):** Add `auth.uid()` based policies for client-side access. Replace demo user with session-based user lookup.

## Key Insights

### RLS Architecture

Two access patterns exist:
1. **Server-side (Prisma)** — Uses `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS entirely
2. **Client-side (Supabase JS)** — Uses `SUPABASE_ANON_KEY` — subject to RLS policies

Current app is entirely server-side (API routes + server actions). RLS policies are defensive — they protect against:
- Future client-side Supabase queries (when client components need direct DB access)
- Admin/API key leaks
- Multi-tenant data leaks once auth ships

### Table Ownership Model

| Table | User Ownership | Policy Logic |
|-------|---------------|--------------|
| `users` | Own row only | `auth.uid() = id` (read/update own profile) |
| `passages` | Via `userId` FK | `auth.uid() = userId` |
| `questions` | Via passage owner | `auth.uid() = (SELECT userId FROM passages WHERE id = passageId)` |
| `card_reviews` | Via `userId` FK | `auth.uid() = userId` |
| `study_sessions` | Via `userId` FK | `auth.uid() = userId` |

### User ID Type Consideration

- Prisma schema uses `String @id @default(cuid())` for user IDs
- Supabase Auth uses UUIDs for `auth.uid()`
- **Decision:** When #22 ships, either:
  - Add `supabaseUuid UUID` column to users table and map `auth.uid()` to it, OR
  - Keep CUID IDs and use a JWT claim or lookup table
- **For now:** RLS policies use service-role bypass (Stage A). Exact `auth.uid()` mapping deferred to #22 integration.

### Prisma + RLS Interaction

- Prisma with service role key **bypasses RLS** — all queries work as-is
- This is correct for server-side operations (API routes, server actions)
- RLS only affects queries made with anon key (client-side Supabase client)

## Requirements

### Functional
- RLS enabled on all 5 tables
- Service role key bypasses RLS for server-side Prisma operations
- Policies defined for all CRUD operations per table
- No existing functionality breaks during Stage A

### Non-Functional
- RLS policies are performant (indexed columns used in policy conditions)
- Service role key used ONLY server-side, never exposed to client
- Policies are idempotent (can be re-applied without error)

## Related Code Files

| File | Action |
|------|--------|
| No app code files | Changes are SQL-only at this stage |
| `supabase/migrations/` | Create — new migration file with RLS policies |

## Implementation Steps

### Stage A: Enable RLS (Pre-Auth)

1. **Create RLS migration file**
   `supabase/migrations/YYYYMMDDHHMMSS_enable_rls.sql`

2. **Enable RLS on all tables**
   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
   ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE card_reviews ENABLE ROW LEVEL SECURITY;
   ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
   ```

3. **Add service-role bypass policy**
   Service role (`postgres` user) already bypasses RLS by default in Supabase. No explicit policy needed. Verify:
   ```sql
   -- Verify service role bypasses RLS
   -- This is default Supabase behavior for the `postgres` role
   -- Prisma uses the service role connection, so all queries work
   ```

4. **Add permissive policy for demo user (temporary)**
   Until auth ships, add a policy that allows all operations for authenticated connections using anon key with the demo user context:
   ```sql
   -- Temporary: allow all reads/writes (demo user phase)
   -- These will be replaced with proper policies in Stage B
   CREATE POLICY "Allow all during demo phase" ON users FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Allow all during demo phase" ON passages FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Allow all during demo phase" ON questions FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Allow all during demo phase" ON card_reviews FOR ALL USING (true) WITH CHECK (true);
   CREATE POLICY "Allow all during demo phase" ON study_sessions FOR ALL USING (true) WITH CHECK (true);
   ```

5. **Apply migration**
   ```bash
   npx supabase db push
   ```

6. **Verify RLS is enabled but not blocking**
   - Run existing app — all CRUD operations should still work
   - Check Supabase Dashboard > Authentication > Policies — all tables show RLS enabled

### Stage B: Proper Policies (Post-Auth #22)

**BLOCKED by Issue #22.** Do not execute until auth is implemented.

7. **Replace permissive policies with scoped policies**
   ```sql
   -- Users: read/update own profile
   DROP POLICY IF EXISTS "Allow all during demo phase" ON users;
   CREATE POLICY "Users can read own profile" ON users
     FOR SELECT USING (id = (SELECT auth.jwt() ->> 'sub'));
   CREATE POLICY "Users can update own profile" ON users
     FOR UPDATE USING (id = (SELECT auth.jwt() ->> 'sub'));

   -- Passages: full CRUD on own passages
   DROP POLICY IF EXISTS "Allow all during demo phase" ON passages;
   CREATE POLICY "Users can CRUD own passages" ON passages
     FOR ALL USING (user_id = (SELECT auth.jwt() ->> 'sub'))
     WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

   -- Questions: access via passage ownership
   DROP POLICY IF EXISTS "Allow all during demo phase" ON questions;
   CREATE POLICY "Users can read questions from own passages" ON questions
     FOR SELECT USING (
       passage_id IN (SELECT id FROM passages WHERE user_id = (SELECT auth.jwt() ->> 'sub'))
     );
   CREATE POLICY "Users can insert questions to own passages" ON questions
     FOR INSERT WITH CHECK (
       passage_id IN (SELECT id FROM passages WHERE user_id = (SELECT auth.jwt() ->> 'sub'))
     );
   CREATE POLICY "Users can delete questions from own passages" ON questions
     FOR DELETE USING (
       passage_id IN (SELECT id FROM passages WHERE user_id = (SELECT auth.jwt() ->> 'sub'))
     );

   -- Card Reviews: full CRUD on own reviews
   DROP POLICY IF EXISTS "Allow all during demo phase" ON card_reviews;
   CREATE POLICY "Users can CRUD own card reviews" ON card_reviews
     FOR ALL USING (user_id = (SELECT auth.jwt() ->> 'sub'))
     WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

   -- Study Sessions: full CRUD on own sessions
   DROP POLICY IF EXISTS "Allow all during demo phase" ON study_sessions;
   CREATE POLICY "Users can CRUD own study sessions" ON study_sessions
     FOR ALL USING (user_id = (SELECT auth.jwt() ->> 'sub'))
     WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));
   ```

   **Note:** The exact `auth.jwt() ->> 'sub'` mapping depends on how #22 maps Supabase Auth UUIDs to the CUID-based `id` in the users table. This SQL will need adjustment during #22 integration.

8. **Test with authenticated and unauthenticated requests**
   - Unauthenticated request should return empty result set
   - Authenticated request should return only own data
   - Cross-user data access should be blocked

## Todo List

### Stage A (Pre-Auth)
- [ ] Create RLS migration SQL file
- [ ] Enable RLS on all 5 tables
- [ ] Add temporary permissive policies
- [ ] Apply migration
- [ ] Verify existing app functionality unaffected

### Stage B (Post-Auth #22) — BLOCKED
- [ ] Replace permissive policies with scoped policies
- [ ] Verify user ID mapping (Supabase Auth UUID <-> Prisma CUID)
- [ ] Test with authenticated requests
- [ ] Test cross-user isolation
- [ ] Test unauthenticated rejection

## Success Criteria

### Stage A
- [ ] All 5 tables have RLS enabled (verify in Supabase Dashboard)
- [ ] All CRUD operations still work (service role bypass)
- [ ] Temporary permissive policies in place

### Stage B
- [ ] Each user can only read/write their own data
- [ ] Questions accessible only via owned passages
- [ ] Unauthenticated requests return empty/error
- [ ] No cross-user data leakage

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Service role key exposed to client | Low | Critical | Audit all imports; never use in client components |
| RLS breaks existing server-side queries | Low | High | Service role bypasses RLS; verify connection string uses service role |
| UUID vs CUID mismatch in Stage B | High | Medium | Deferred to #22 integration; Stage A uses permissive policies |
| Policy performance on questions table (subquery) | Low | Medium | `passageId` is indexed; subquery should be fast |
| Missing policy blocks INSERT on new user registration | Medium | Medium | Stage A uses permissive policies; Stage B tested with auth flow |

## Security Considerations

- **Service role key**: Full DB access, bypasses RLS. MUST only be used server-side (API routes, server actions). Never in `NEXT_PUBLIC_*` env vars.
- **Anon key**: Subject to RLS. Safe for client-side. Only effective once proper policies are in place (Stage B).
- **RLS is defense-in-depth**: Even with server-side-only access today, RLS protects against future client-side queries and key leaks.
- **Policy naming**: Use descriptive names for auditability.

## Rollback Plan

1. Disable RLS on all tables:
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE passages DISABLE ROW LEVEL SECURITY;
   ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
   ALTER TABLE card_reviews DISABLE ROW LEVEL SECURITY;
   ALTER TABLE study_sessions DISABLE ROW LEVEL SECURITY;
   ```
2. Drop all policies:
   ```sql
   DROP POLICY IF EXISTS "Allow all during demo phase" ON users;
   -- ... repeat for all tables and policy names
   ```

## Next Steps

- Stage B requires Issue #22 (auth) to be resolved
- Phase 06 (Testing) validates RLS behavior end-to-end
