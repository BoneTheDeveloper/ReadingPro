---
phase: 8
title: "Database Migration"
status: pending
priority: P1
effort: "20min"
dependencies: ["phase-02-install-configure"]
---

# Phase 8: Database Migration

## Overview

Generate and apply the Better Auth database schema (user, session, account, verification tables) to PostgreSQL.

## Requirements

- Functional: Better Auth tables created in database
- Non-functional: Existing data preserved, migration reversible

## Architecture

```
prisma/schema.prisma → Add Better Auth tables
pnpm prisma migrate dev → Apply migration
```

## Related Code Files

**Modify:**
- `prisma/schema.prisma` — Add Better Auth models

## Implementation Steps

### 8.1 Generate Better Auth Schema

```bash
npx @better-auth/cli generate --adapter prisma
```

This creates a `schema.prisma` snippet with these models:
- `User` (Better Auth's user, NOT your UserProfile)
- `Session`
- `Account`
- `Verification`

### 8.2 Add Models to Schema

Merge the generated models into `prisma/schema.prisma`. The models should be named:
- `User` (Better Auth)
- `Session` (Better Auth)
- `Account` (Better Auth)
- `Verification` (Better Auth)

**Important:** Your existing `model Profile` (actually `model UserProfile`) should remain unchanged.

### 8.3 Run Migration

```bash
# Development
pnpm prisma migrate dev --name add_better_auth

# Production
pnpm prisma migrate deploy
```

### 8.4 Verify Tables Created

```sql
-- Check Better Auth tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user', 'session', 'account', 'verification');
```

### 8.5 Update User ID Type (if needed)

If your `UserProfile.id` is String (Clerk IDs), ensure the `User` model's `id` field is also String. Better Auth uses String UUIDs by default.

## Success Criteria

- [ ] `npx @better-auth/cli generate` completes without errors
- [ ] Models added to `prisma/schema.prisma`
- [ ] `pnpm prisma migrate dev` applies successfully
- [ ] Four new tables exist: user, session, account, verification
- [ ] Existing `UserProfile` table unchanged

## Risk Assessment

- **Risk:** Migration conflicts with existing Clerk user IDs
- **Mitigation:** Better Auth generates its own user IDs; existing UserProfile rows need manual linking

### Post-Migration: Existing Users

If you have existing users from Clerk, you'll need to either:
1. Ask users to re-sign-up (loses data)
2. Create a migration script to link existing UserProfile rows to new Better Auth users

For MVP, recommend option 1 (clean slate).

## Next Steps

Proceed to Phase 9: Cleanup & Test
