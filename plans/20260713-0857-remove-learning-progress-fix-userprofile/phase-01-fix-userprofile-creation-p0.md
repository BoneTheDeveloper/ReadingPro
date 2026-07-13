---
phase: 1
title: Fix UserProfile creation (P0)
status: completed
priority: P1
effort: 1-2h
dependencies: []
---

# Phase 1: Fix UserProfile creation (P0)

## Overview

Guarantee a `UserProfile` (`profiles`) row exists for every Better Auth user, so
tables that FK to `profiles` stop throwing `P2003`. This is a live outage fix and
ships independently of the removal work.

## Requirements

- Functional: after sign-up or first OAuth login, a `profiles` row with `id =
  user.id` exists. Existing users without a profile are backfilled. Idempotent
  (re-login / re-run must not error).
- Non-functional: profile creation lives in the auth lifecycle only — no lazy
  upserts scattered across feature repositories (DRY / separation of concerns).

## Architecture

- `UserProfile.id` **is** a FK to `User.id` (schema.prisma ~line 131), same value,
  `onDelete: Cascade`. Only `id` is required to create a profile (`targetLevel`
  defaults `B2`, `bio` nullable).
- Better Auth `databaseHooks.user.create.after` runs after the `user` row is
  committed → the FK target exists → safe to create the profile. Covers both the
  email/password and Google OAuth paths (both insert a `user` row).
- Use `upsert` (not `create`) in the hook: idempotent against re-signup and OAuth
  account-linking edge cases.

## Related Code Files

- Modify: `src/lib/auth/auth.ts` — add `databaseHooks`
- Read for context: `prisma/schema.prisma` (models `User` ~line 52, `UserProfile`
  ~line 129), `src/lib/auth/auth-server.ts` (`getUserId`, `getCurrentUser`)
- One-off SQL (backfill): run against the dev DB

## Implementation Steps

1. In `src/lib/auth/auth.ts`, add a `databaseHooks` block to the `betterAuth`
   options (alongside `database`, `emailAndPassword`, `socialProviders`, `user`).
   `prisma` is already imported.

   ```ts
   databaseHooks: {
     user: {
       create: {
         after: async (user) => {
           await prisma.userProfile.upsert({
             where: { id: user.id },
             create: { id: user.id },
             update: {},
           });
         },
       },
     },
   },
   ```

2. Backfill existing users (one-off, dev DB — safe/idempotent):

   ```sql
   INSERT INTO profiles (id, "createdAt", "updatedAt")
   SELECT id, now(), now() FROM "user"
   ON CONFLICT (id) DO NOTHING;
   ```

   Run via `psql "$DATABASE_URL" -c "..."` (or Prisma Studio / a throwaway
   script). Confirm row count matches `SELECT count(*) FROM "user"`.

3. Sanity-check the hook signature against the installed better-auth
   (`better-auth@^1.6.23`). If `databaseHooks.user.create.after` differs in this
   version, use the equivalent documented hook; do not invent an API. Verify via
   the better-auth types in `node_modules` or context7 docs before finalizing.

## Success Criteria

- [ ] `src/lib/auth/auth.ts` has the `databaseHooks.user.create.after` upsert
- [ ] New sign-up (email) creates a matching `profiles` row
- [ ] New Google OAuth login creates a matching `profiles` row
- [ ] Backfill applied — every `"user"` row has a `profiles` row
- [ ] The current logged-in user can trigger an upload / study action without a
      `P2003` FK violation
- [ ] `pnpm run typecheck` passes

## Risk Assessment

- **Hook API mismatch across better-auth versions** → verify signature against
  installed version before finalizing (Step 3).
- **Profile creation throws inside the hook** → `upsert` is idempotent; if it
  fails, sign-up should surface the error in dev rather than silently continue.
  Do not swallow it.
- **Additional profile fields become required later** → currently only `id` is
  needed; revisit if `UserProfile` gains required non-defaulted fields.
