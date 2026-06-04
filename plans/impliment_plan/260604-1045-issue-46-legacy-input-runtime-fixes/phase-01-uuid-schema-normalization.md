---
phase: 1
title: "Public Schema UUID Normalization"
status: pending
priority: P0
effort: "4h"
dependencies: []
---

# Phase 1: Public Schema UUID Normalization

## Overview

Verify every application-owned persisted identifier uses native UUID columns
before fixing route boundaries. The blocking Clerk/Neon migration owns the
clean baseline, string Clerk identity fields, and removal of Supabase/RLS.

Do not execute the old Supabase/RLS migration workflow after the blocking plan.

## Requirements

- Functional: every application-owned primary key uses PostgreSQL `uuid`.
- Functional: every application-owned foreign key or persisted entity-reference
  column uses PostgreSQL `uuid`.
- Functional: Prisma-created application records receive UUID defaults.
- Functional: `profiles.id` and every owned-table `userId` remain Clerk string
  identities without application-generated defaults.
- Functional: development reset recreates the schema and dictionary data using
  UUIDs only.
- Non-functional: do not attempt to preserve current development CUID rows.

## Identifier Standard

```prisma
// Clerk owns this value.
id String @id

// Application/public-table records: database-generated UUID v4.
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

// Application-owned relations and persisted entity references.
passageId String @db.Uuid
```

Apply native UUIDs to:

- All application-owned model primary keys.
- Application-owned relation fields: `passageId`, `sourceId`, `questionId`,
  `entryId`, and `senseId`.
- `DictionarySourceAudit.entityId`, because it stores a public-table entity ID.

Keep Clerk identity strings unchanged:

- `profiles.id`.
- Every owned-table `userId` foreign key.

Keep ordinary strings unchanged:

- `cacheKey`, `normalizedKey`, `stripeCustomerId`, language codes, provider
  names, learner content, and UI-only/result/question-option IDs.

## Related Code Files

- Modify: `prisma/schema.prisma`
- Review: clean Prisma baseline from the blocking Clerk/Neon migration
- Modify: `prisma/seed.ts`
- Modify as needed: dictionary dataset generation/validation scripts
- Modify: `docs/database/erd.md`
- Modify: `docs/database/data-dictionary.md`

## Implementation Steps

1. Verify every application-owned primary key uses native `@db.Uuid`.
2. Use database-side `gen_random_uuid()` defaults for application-owned record
   IDs; keep Clerk identity fields as strings without defaults.
3. Verify application-owned relation and entity-reference fields use `@db.Uuid`.
4. Review the clean baseline supplied by the blocking migration plan.
5. Replay the plain-PostgreSQL migration baseline on a disposable branch.
6. Regenerate Prisma Client, reseed dictionary data, and validate the seed.
7. Verify no application-owned identifier remains `TEXT` and no generated
   persisted record uses CUID.

## Reset Gate

The reset is destructive and permitted only because this environment is
development-only:

```bash
pnpm exec prisma migrate reset --force
pnpm run db:generate
pnpm run db:seed:dictionary
pnpm run db:validate:dictionary
```

## Success Criteria

- [ ] Every application-owned PK/FK/entity-reference identifier is PostgreSQL `uuid`.
- [ ] Application-owned IDs have database UUID defaults.
- [ ] `profiles.id` and owned `userId` fields accept Clerk string IDs.
- [ ] Plain-PostgreSQL migration replay succeeds with no RLS/Supabase objects.
- [ ] Dictionary reseed and validation succeed.
- [ ] Prisma schema, generated client, migration SQL, and database docs agree.

## Risk Assessment

- Reset destroys all development data. Confirm the target database before
  running the reset.
- UUID type changes require every related column to change together or foreign
  keys will fail.
- `gen_random_uuid()` availability must be represented in migration history so
  reset/shadow databases behave consistently.

## Security Considerations

- Preserve all current ownership relations and cascade behavior.
- Native UUIDs improve type consistency but do not replace ownership checks.
- Do not point destructive reset commands at staging or production.
