---
phase: 2
title: "Clean Neon Prisma Baseline"
status: in-progress
priority: P1
effort: "7h"
dependencies: [1]
---

# Phase 2: Clean Neon Prisma Baseline

## Overview

Rewrite the Prisma identity model and migration history for a clean Neon
PostgreSQL deployment. Clerk identity fields become PostgreSQL text; all
application-owned IDs remain UUID. Remove every Supabase/RLS object.

## Context Links

- [Plan](./plan.md)
- [Manual provider checklist](./phase-01-02-manual-provider-checklist.md)
- [Prisma schema](../../../prisma/schema.prisma)
- [Clean baseline](../../../prisma/migrations/20260604190000_init_neon_clerk/migration.sql)
- [Prisma config](../../../prisma.config.ts)

## Requirements

- Functional:
  - `profiles.id` is Clerk `userId` text.
  - Every owned-table `userId` is text FK to `profiles.id`.
  - Domain IDs and domain FKs remain UUID.
  - Clean baseline deploys to empty plain PostgreSQL.
  - Dictionary seed remains reproducible.
  - Private Blob client uploads have a durable, expiring upload-intent record.
  - `StudySession.passageId` is a real optional FK to `Passage`.
- Non-functional:
  - Migration SQL contains only plain PostgreSQL schema objects/extensions.
  - No RLS, Supabase schemas, roles, auth functions, or auth triggers.
  - No legacy data conversion because cutover is clean.

## Architecture

```prisma
model UserProfile {
  id String @id // Clerk user_...
}

model Passage {
  id     String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId String
  filePath String? @unique
  user   UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model FileUploadIntent {
  id        String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String
  pathname  String @unique
  expiresAt DateTime
  user      UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

Apply the same text identity FK pattern to `StudyChatMessage`, `CardReview`,
`StudySession`, `TranslationCache`, `TranslationHistory`, and
`VocabularyItem`. Remove `@db.Uuid` from identity fields only. Remove
`@unique` from cached profile email because Clerk ID is authoritative and email
is mutable metadata. Add the missing optional `StudySession` to `Passage`
relation with explicit `onDelete: SetNull` behavior.

## File Inventory

| Action | File | Change | Test impact |
|---|---|---|---|
| Modify | `prisma/schema.prisma` | Clerk string identity fields; unique `filePath`; upload intents; StudySession passage FK; keep domain UUIDs | Prisma generation/typecheck |
| Delete/replace | `prisma/migrations/*` | One clean plain-Postgres baseline | Migration replay |
| Delete | `prisma/rls/` | Remove RLS source and docs | Forbidden-term audit |
| Create | `scripts/database/assert-plain-postgres-migrations.ts` | Fail on Supabase/RLS forbidden objects | CI smoke |
| Modify | `package.json` | Add migration audit/replay scripts | CI |
| Regenerate | `src/generated/prisma/` | Align generated types | All TS tests |
| Modify | tests/fixtures using user UUIDs | Use representative Clerk IDs | Repository/route tests |

## Model Checklist

- [x] `UserProfile.id`: `String @id`, no `@db.Uuid`.
- [x] All owned `userId`: `String`, no `@db.Uuid`, FK to profile.
- [x] All passage/question/session/dictionary/translation record IDs remain UUID.
- [x] `Passage.filePath` replaces `fileUrl`.
- [x] `Passage.filePath` is unique so upload finalization retries are idempotent.
- [x] `FileUploadIntent` uses UUID ID, Clerk string `userId`, unique pathname,
  expiry index, and profile cascade.
- [x] `StudySession.passageId` has an explicit FK/relation with `onDelete: SetNull`.
- [x] Profile `email` is cached metadata, not identity/unique key.
- [x] Existing cascade rules and owned-table indexes remain.

## Implementation Status — June 4, 2026

### Completed And Verified In Repository

- [x] Updated Prisma identity, `filePath`, upload-intent, and StudySession
  relation contracts.
- [x] Removed the old Supabase/RLS migrations and canonical RLS directory.
- [x] Generated one clean baseline migration from the final Prisma schema.
- [x] Added `pnpm db:migrate:audit` and CI migration-audit execution.
- [x] Updated affected application properties and fixtures from `fileUrl` to
  `filePath` and representative Clerk IDs.
- [x] Ran `prisma format`, `prisma validate`, Prisma client generation,
  migration audit, and `pnpm typecheck` successfully.

### Manual Database Work Required

- [ ] Deploy and seed the clean baseline on empty `development`.
- [ ] Recreate/reset `dev/luc` from seeded `development`.
- [ ] Replay and seed on an additional empty throwaway branch.
- [ ] Run the FK, uniqueness, cascade, and column-type checks from
  [the manual provider checklist](./phase-01-02-manual-provider-checklist.md).
- [ ] Leave `production` unchanged.

## Forbidden Migration Tokens

Audit all committed migration SQL for:

```text
auth.users
auth.uid(
anon
authenticated
service_role
ENABLE ROW LEVEL SECURITY
CREATE POLICY
handle_new_user
on_auth_user_created
```

## Implementation Steps

1. Update Prisma schema identity, unique `filePath`, upload-intent, and missing
   StudySession passage-relation fields.
2. Delete current baseline/RLS migrations and canonical RLS directory.
3. Generate one new baseline from the final schema against an empty temporary
   PostgreSQL/Neon branch.
4. Review SQL for tables, enums/extensions, indexes, constraints, and FKs only.
5. Add automated forbidden-token migration audit.
6. Run `prisma format`, `prisma validate`, generate client, and typecheck.
7. Deploy baseline to empty `development`; seed canonical dictionary data.
8. Recreate/reset `dev/luc` from the seeded `development` baseline.
9. Verify migrations and seeds on an additional empty throwaway branch.
10. Leave `production` unchanged until the gated workflow and final cutover.

## Test Scenario Matrix

| Priority | Scenario | Expected |
|---|---|---|
| Critical | Fresh migrate deploy on empty PostgreSQL | All schema objects created |
| Critical | Insert `profiles.id = user_test123` and owned row | FK succeeds |
| Critical | Insert owned row without profile | FK fails |
| Critical | Duplicate finalized `filePath` | Unique constraint prevents duplicate passage |
| Critical | Delete profile with pending upload intent | Intent cascades |
| Critical | Migration forbidden-token audit | Zero Supabase/RLS matches |
| High | Delete profile | Owned DB rows cascade |
| High | Dictionary seed and validation | Reproducible and valid |
| High | Inspect column types | Identity is text; domain IDs are UUID |

## Dependency Map

- Requires Phase 1 Neon branches and connection contract.
- Blocks Phase 3 profile/auth implementation.
- Blocks Phase 4 authorization tests using Clerk-like IDs.
- Blocks Phase 5 `filePath` storage contract.
- Provides baseline consumed by Phase 6 preview migration automation.

## Success Criteria

- [ ] Empty plain PostgreSQL migration replay passes.
- [ ] Clerk IDs persist directly and satisfy all owned FKs on a replayed database.
- [x] Domain entity IDs remain UUID and current UUID boundary validation remains valid.
- [x] No Supabase/RLS-specific object remains in migrations.
- [x] `filePath` replaces `fileUrl` in generated Prisma types.
- [ ] Upload-intent and StudySession-passage integrity constraints exist and replay on an empty database.
- [ ] Development/local branches share the approved clean baseline; production
  remains gated for final cutover.

## Risk Assessment

- Risk: broad generated-type fallout after `fileUrl` rename and identity type change.
  Mitigation: regenerate immediately; update fixtures before feature refactors.
- Risk: stale migrations survive outside the canonical directory.
  Mitigation: repository-wide forbidden-token audit.
- Risk: baseline accidentally applied to a non-empty database.
  Mitigation: verify branch identity and emptiness before deploy.

## Security Considerations

- No database bypass role or browser-access role is created.
- Prisma remains server-only.
- FK/cascade rules provide integrity, not authorization; Phase 4 owns authorization.
