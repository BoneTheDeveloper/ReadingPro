# Plan: Migrate User → UserProfile (Option B)

## Context

Current `User` model uses `cuid()` PK with optional `supabaseAuthId` link — the anti-pattern Supabase warns against. This migration makes `auth.users.id` the PK, renames to `UserProfile` (table: `profiles`), adds profile fields (avatar from Google, bio, tier, stripe), and adds a DB trigger for auto-creation.

**Key simplification:** RLS policies go from JOIN-heavy to simple `"userId" = auth.uid()`. Sync logic becomes trivial.

## Phase 1: Database Migration (SQL)

**New file:** `supabase/migrations/001_user_to_profile.sql`

Steps:
1. Create `Tier` enum (`FREE`, `PRO`)
2. Create `profiles` table — `id UUID PK REFERENCES auth.users(id)`, fields: `email`, `name`, `avatarUrl`, `bio`, `targetLevel`, `tier`, `stripeCustomerId`, timestamps
3. Migrate data: `INSERT INTO profiles SELECT supabaseAuthId, email, name, targetLevel, ... FROM users WHERE supabaseAuthId IS NOT NULL`
4. Update child table FKs: `UPDATE passages/card_reviews/study_sessions SET "userId" = u."supabaseAuthId" FROM users u WHERE ...`
5. Drop old FK constraints → recreate pointing to `profiles(id)`
6. Drop old RLS policies → create simplified ones using `auth.uid()`
7. Drop `users` table
8. Add `handle_new_user()` trigger on `auth.users` — auto-creates profile with `name` from `raw_user_meta_data->>'full_name'`, `avatarUrl` from `raw_user_meta_data->>'avatar_url'`

**Pre-flight:** Verify FK constraint names via `\d tablename` in psql before writing migration.

## Phase 2: Prisma Schema

**Modify:** `prisma/schema.prisma`

- Replace `User` model → `UserProfile` with `@@map("profiles")`
- `id` is now `String @id` (no `@default(cuid()`) — value comes from `auth.users.id`
- Remove `supabaseAuthId` field
- Add fields: `avatarUrl String?`, `bio String?`, `tier Tier @default(FREE)`, `stripeCustomerId String? @unique`
- Add `enum Tier { FREE PRO }`
- Update relations in `Passage`, `CardReview`, `StudySession` → reference `UserProfile`
- Run `npx prisma generate`

## Phase 3: Application Code

| File | Change |
|------|--------|
| `src/lib/auth/auth-utils.ts` | Simplify `syncUserWithDatabase()`: find by `id` (= auth UUID), fallback create. Remove email migration logic. |
| `src/lib/auth/sync-user.ts` | Change to `db.userProfile.upsert({ where: { id: authId }, ... })`, add `avatarUrl` param |
| `src/app/auth/callback/route.ts` | Pass `user.user_metadata?.avatar_url` to `syncUser()` |
| `src/lib/db/utils.ts` | Remove `createUser()` and `getOrCreateUser()` (legacy, no callers after auth migration) |
| `src/components/user-menu.tsx` | **No change** — reads from Supabase auth directly |
| All API routes / server actions | **No change** — use `user.id` via `getAuthenticatedUser()`, which now returns UUID |

## Phase 4: Verify

1. `npx prisma generate` — no errors
2. `npx tsc --noEmit` — no type errors
3. Test auth flow: sign in → profile auto-created in `profiles`
4. Test passage creation → `userId` in `passages` matches `auth.users.id`
5. Test card review and study session flows
6. Verify RLS: user can only see own data

## Files Summary

| File | Action |
|------|--------|
| `supabase/migrations/001_user_to_profile.sql` | CREATE |
| `prisma/schema.prisma` | MODIFY |
| `src/lib/auth/auth-utils.ts` | MODIFY |
| `src/lib/auth/sync-user.ts` | MODIFY |
| `src/app/auth/callback/route.ts` | MODIFY |
| `src/lib/db/utils.ts` | MODIFY |
