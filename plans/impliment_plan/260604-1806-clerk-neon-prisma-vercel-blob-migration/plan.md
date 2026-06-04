---
title: "Clerk Neon Prisma Vercel Blob Migration"
description: "Replace Supabase auth, database, storage, and RLS with Clerk, Neon PostgreSQL, Prisma, private Vercel Blob, and isolated Neon preview branches."
status: pending
priority: P1
effort: 48h
branch: "feat/clerk-neon-prisma-vercel-blob-migration"
tags: [refactor, infra, auth, database, backend, frontend, critical]
blockedBy: []
blocks:
  - project:impliment_plan/260604-1045-issue-46-legacy-input-runtime-fixes
  - project:impliment_plan/260604-1102-issue-46-output-boundary-migration
created: "2026-06-04T11:06:24.969Z"
createdBy: "ck:plan"
source: skill
---

# Clerk Neon Prisma Vercel Blob Migration

## Overview

Clean-cut migration from Supabase to:

- Clerk authentication with localized embedded sign-in/sign-up pages.
- Neon plain PostgreSQL with Prisma schema, migrations, and access.
- Clerk `userId` strings as `profiles.id` and every owned-table `userId`.
- Application-layer authorization in services/repositories; no RLS.
- Private Vercel Blob with authenticated, ownership-checked access.
- Persistent `production`, `development`, and `dev/luc` Neon branches plus
  isolated `preview/pr-<number>` branches.

No Supabase user/data migration. Seed only canonical application/dictionary
data. Keep domain record IDs as UUID; only user identity keys become text.

## Fixed Decisions

| Area | Decision |
|---|---|
| Identity | `profiles.id` and owned `userId` fields store Clerk IDs directly |
| Profile creation | Synchronous first-use upsert plus verified Clerk webhooks |
| User deletion | Delete private blobs, then delete profile and cascade DB rows |
| Auth UX | Embedded localized Clerk components; no Clerk-hosted primary UX |
| Authorization | Explicit actor `userId` in service/repository operations |
| Database | Neon plain PostgreSQL; Prisma 7 + existing `@prisma/adapter-pg` |
| Migrations | Clean replayable baseline; no Supabase/RLS/auth-schema objects |
| Storage | Private Vercel Blob; store `Passage.filePath`, not public URL |
| Preview DB | `preview/pr-<number>` from `production`; migrate then deploy |
| Production | Protected Neon branch and gated migration/deployment workflow |

## Branch And Environment Mapping

| Environment | Neon branch | Connection policy |
|---|---|---|
| Local `.env.local` | `dev/luc` | Pooled `DATABASE_URL`; direct `DIRECT_URL` |
| Vercel Development / local-like dev | `development` | Pooled runtime URL; direct URL only for intentional migration work |
| Vercel Preview | `preview/pr-<number>` | Pooled runtime URL; direct URL only in preview migration job |
| Vercel Production | protected `production` | Pooled runtime URL; direct URL only in approved production migration job |

Branch topology:

```text
production
├── development
│   └── dev/luc
└── preview/pr-<number>
```

Preview branches copy production data while the product is still development
only. Before real production user data exists, switch preview creation to a
schema-only or sanitized preview parent.

## Cross-Plan Dependencies

| Relationship | Plan | Reason |
|---|---|---|
| Blocks | `260604-1045-issue-46-legacy-input-runtime-fixes` | Its "all IDs are UUID" rule must exclude Clerk identity fields |
| Blocks | `260604-1102-issue-46-output-boundary-migration` | Auth mocks, route boundaries, and upload response contracts change here |

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Environment and Branch Contracts](./phase-01-environment-and-branch-contracts.md) | Pending |
| 2 | [Clean Neon Prisma Baseline](./phase-02-clean-neon-prisma-baseline.md) | Pending |
| 3 | [Clerk Auth and Profile Lifecycle](./phase-03-clerk-auth-and-profile-lifecycle.md) | Pending |
| 4 | [Application Authorization Hardening](./phase-04-application-authorization-hardening.md) | Pending |
| 5 | [Private Vercel Blob Storage](./phase-05-private-vercel-blob-storage.md) | Pending |
| 6 | [Preview and Production Deployment Automation](./phase-06-preview-and-production-deployment-automation.md) | Pending |
| 7 | [Supabase Removal and Documentation](./phase-07-supabase-removal-and-documentation.md) | Pending |
| 8 | [Verification and Clean Cutover](./phase-08-verification-and-clean-cutover.md) | Pending |

## Dependencies

- External setup: Clerk development/production instances, Neon project and
  branches, private Vercel Blob development/production stores.
- GitHub/Vercel secrets for Neon branch automation and gated deployments.
- Current Issue 46 route/input fixes remain the code starting point; only its
  Clerk identity UUID assumption is superseded.

## Out Of Scope

- Migrating Supabase users, sessions, files, or application data.
- Database-level RLS or direct browser database access.
- Multi-tenant organizations/roles beyond owner-by-`userId`.
- Switching Prisma to `@prisma/adapter-neon` without measured need.
- Account recovery, retention, or delayed deletion workflows.

## Global Success Criteria

- Fresh `prisma migrate deploy` succeeds on empty Neon PostgreSQL.
- Migration SQL contains no Supabase auth schema, roles, triggers, or RLS.
- User identity keys are text Clerk IDs; all domain IDs remain UUID.
- Embedded `/en` and `/vi` Clerk sign-in/sign-up flows work.
- First authenticated request succeeds even before webhook delivery.
- Cross-user reads/writes/deletes fail at service/repository boundaries.
- Private Blob upload, authorized download, rollback cleanup, and user cleanup work.
- PR previews use isolated `preview/pr-<number>` branches and delete them on close.
- Production migration/deployment requires an explicit approval gate.
- No Supabase package, config, environment variable, CSP entry, mock, or doc remains.
- Prisma validation, migration replay, lint, typecheck, tests, build, and E2E pass.
