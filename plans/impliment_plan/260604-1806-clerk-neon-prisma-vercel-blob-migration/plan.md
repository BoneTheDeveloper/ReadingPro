---
title: "Clerk Neon Prisma Vercel Blob Migration"
description: "Replace Supabase auth, database, storage, and RLS with Clerk, Neon PostgreSQL, Prisma, private Vercel Blob, and isolated Neon preview branches."
status: in-progress
priority: P1
effort: 60h
branch: "feat/clerk-neon-prisma-vercel-blob-migration"
tags: [refactor, infra, auth, database, backend, frontend, critical]
blockedBy: []
blocks:
  - 260604-1045-issue-46-legacy-input-runtime-fixes
  - 260604-1102-issue-46-output-boundary-migration
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
| StudySession link | Optional Passage foreign key with `onDelete: SetNull`; profile deletion still cascades through user-owned sessions |
| Profile creation | Synchronous first-use upsert plus verified Clerk webhooks |
| Auth errors | One provider-neutral typed auth error/classifier; API routes return stable `401` |
| User deletion | Delete/null private blob references in bounded batches, then delete profile and cascade DB rows |
| Auth UX | Embedded localized Clerk components; no Clerk-hosted primary UX |
| Authorization | Explicit actor `userId` in service/repository operations |
| Database | Neon plain PostgreSQL; Prisma 7 + existing `@prisma/adapter-pg` |
| Migrations | Clean replayable baseline; no Supabase/RLS/auth-schema objects |
| Storage | Authenticated direct client upload to private Blob, durable upload intent, server finalization; store unique `Passage.filePath` |
| Upload limit | Preserve current 10 MB contract; do not send file bodies through Vercel Functions |
| Preview DB | Trusted same-repository PRs use `preview/pr-<number>`; forks/Dependabot receive secretless CI only |
| Deployment owner | GitHub Actions only; disable Vercel Git auto-deployments |
| Production | Protected Neon branch; approved migrate, staged deploy, smoke, then promote |

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

## Pre-Implementation Feasibility Gates

These are blockers, not documentation-only warnings:

| Gate | Required outcome |
|---|---|
| Neon plan | Paid plan supports protected `production`; otherwise upgrade or define an equally strong external protection before implementation |
| GitHub environment | Repository plan supports protected production environment, required reviewer, branch restriction, and no self-approval |
| Vercel ownership | `git.deploymentEnabled: false` is accepted; GitHub Actions is the only preview/production deploy owner |
| Preview trust | Fork and Dependabot PRs cannot access Neon, Clerk, Blob, Vercel, or production-like data secrets |
| Production data | Before real user data, preview parent changes from `production` to a sanitized/schema-only branch |
| Upload architecture | 10 MB file flow uses Blob client uploads because Vercel Function request/response payloads are capped at 4.5 MB |

## Cross-Plan Dependencies

| Relationship | Plan | Reason |
|---|---|---|
| Blocks | `260604-1045-issue-46-legacy-input-runtime-fixes` | Its "all IDs are UUID" rule must exclude Clerk identity fields |
| Blocks | `260604-1102-issue-46-output-boundary-migration` | Auth mocks, route boundaries, and upload response contracts change here |

## Current Implementation Status

Repository implementation for Phases 1 and 2 started on June 4, 2026.

- Completed and verified locally:
  - Environment template, ignore rules, and Neon environment contract.
  - Clerk text identity schema, unique `Passage.filePath`,
    `FileUploadIntent`, and StudySession-Passage FK.
  - One clean plain-PostgreSQL baseline migration.
  - Supabase/RLS migration removal and automated migration audit.
  - Prisma format/validation, generated client, and full TypeScript check.
- Waiting for manual provider work:
  - Neon branches/protection, Clerk instances, Blob stores, Vercel/GitHub
    environment ownership, and provider capability confirmation.
  - Baseline deploy/seed on empty `development`, `dev/luc`, and a throwaway
    verification branch.
- Do not apply the clean baseline to an existing non-empty database.
- Record manual results in
  [Phase 1-2 Manual Provider Checklist](./phase-01-02-manual-provider-checklist.md).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Environment and Branch Contracts](./phase-01-environment-and-branch-contracts.md) | In progress: manual provider setup required |
| 2 | [Clean Neon Prisma Baseline](./phase-02-clean-neon-prisma-baseline.md) | In progress: empty-branch replay/seed required |
| 3 | [Clerk Auth and Profile Lifecycle](./phase-03-clerk-auth-and-profile-lifecycle.md) | In progress: webhook and stable-401 work remain |
| 4 | [Application Authorization Hardening](./phase-04-application-authorization-hardening.md) | Pending |
| 5 | [Private Vercel Blob Storage](./phase-05-private-vercel-blob-storage.md) | Pending |
| 6 | [Preview and Production Deployment Automation](./phase-06-preview-and-production-deployment-automation.md) | Pending |
| 7 | [Supabase Removal and Documentation](./phase-07-supabase-removal-and-documentation.md) | Pending |
| 8 | [Verification and Clean Cutover](./phase-08-verification-and-clean-cutover.md) | Pending |

## Dependencies

- External setup: Clerk development/production instances, Neon project and
  branches, private Vercel Blob development/production stores.
- GitHub/Vercel secrets for Neon branch automation and gated deployments.
- Provider/account capabilities in the pre-implementation feasibility gates.
- Current Issue 46 route/input fixes remain the code starting point; only its
  Clerk identity UUID assumption is superseded.

## Out Of Scope

- Migrating Supabase users, sessions, files, or application data.
- Database-level RLS or direct browser database access.
- Multi-tenant organizations/roles beyond owner-by-`userId`.
- Switching Prisma to `@prisma/adapter-neon` without measured need.
- Account recovery, retention, or delayed deletion workflows.
- A general-purpose background job system beyond the bounded expired-upload
  cleanup required by private Blob client uploads.

## Global Success Criteria

- Fresh `prisma migrate deploy` succeeds on empty Neon PostgreSQL.
- Migration SQL contains no Supabase auth schema, roles, triggers, or RLS.
- User identity keys are text Clerk IDs; all domain IDs remain UUID.
- Embedded `/en` and `/vi` Clerk sign-in/sign-up flows work.
- First authenticated request succeeds even before webhook delivery.
- Missing/invalid Clerk auth returns stable `401`, not provider-specific or `500` behavior.
- Cross-user reads/writes/deletes fail at service/repository boundaries.
- 10 MB private Blob upload, server finalization, authorized download, rollback,
  abandoned-upload cleanup, passage cleanup, and user cleanup work.
- Trusted PR previews use isolated `preview/pr-<number>` branches and delete
  them on close; untrusted PRs never receive privileged secrets.
- Production migration/deployment requires approval, target verification,
  staged smoke, and explicit promotion.
- No Supabase package, config, environment variable, CSP entry, mock, or doc remains.
- Prisma validation, migration replay, lint, typecheck, tests, build, and E2E pass.
