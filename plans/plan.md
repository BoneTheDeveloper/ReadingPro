---
title: "Clerk to Better Auth Migration"
description: "Replace Clerk with Better Auth - self-hosted auth with email/password + OAuth"
status: pending
priority: P1
branch: "preview"
tags: ["auth", "migration", "better-auth", "security"]
blockedBy: []
blocks: []
created: "2026-07-09T01:38:10.671Z"
createdBy: "ck:plan"
source: skill
---

# Clerk to Better Auth Migration

## Overview

Replace Clerk (`@clerk/nextjs`) with Better Auth — a self-hosted auth solution with email/password and OAuth support. Better Auth manages auth credentials and sessions in its own tables (`user`, `session`, `account`, `verification`) that coexist with the existing `UserProfile` table (linked by matching `id` values). Billing fields (`tier`, `stripeCustomerId`) move to Better Auth's user table as custom fields.

## Architecture Decision

| Data | Table | Reason |
|------|-------|--------|
| Auth credentials, sessions | Better Auth `user`, `session` | Managed by library |
| OAuth accounts | Better Auth `account` | Managed by library |
| `tier`, `stripeCustomerId` | Better Auth `user` (custom fields) | Keeps billing in sync with auth |
| App data (passages, vocabulary) | `UserProfile` + relations | Existing table, linked by `id` |

**Linking strategy:** Better Auth's `user.id` = `UserProfile.id` (same UUID value, different tables). After sign-up, `afterSignUp` callback creates the `UserProfile` row.

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | [Research](./phase-01-research.md) | Pending | Done |
| 2 | [Install & Configure](./phase-02-install-configure.md) | Pending | 30min |
| 3 | [Middleware](./phase-03-middleware.md) | Pending | 15min |
| 4 | [Auth Server](./phase-04-auth-server.md) | Pending | 30min |
| 5 | [Auth Client](./phase-05-auth-client.md) | Pending | 15min |
| 6 | [Auth UI](./phase-06-auth-ui.md) | Pending | 1h |
| 7 | [Feature Updates](./phase-07-feature-updates.md) | Pending | 30min |
| 8 | [Database Migration](./phase-08-database-migration.md) | Pending | 20min |
| 9 | [Cleanup & Test](./phase-09-cleanup-test.md) | Pending | 30min |

## Key Changes

1. **Remove:** `@clerk/nextjs`, Clerk env vars, Clerk webhook handler
2. **Add:** `better-auth`, Prisma adapter, Better Auth tables, custom UI pages
3. **Update:** All feature actions (`getUserId`), middleware, auth-controls
4. **Preserve:** `UserProfile` table, existing data, next-intl integration

## Environment Variables

**Remove:**
```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SIGNING_SECRET
```

**Add:**
```env
BETTER_AUTH_SECRET=<32+ char random secret>
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Dependencies
- None (blocks on nothing)
