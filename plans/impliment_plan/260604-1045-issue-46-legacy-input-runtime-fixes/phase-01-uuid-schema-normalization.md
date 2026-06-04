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

Normalize every persisted identifier in the PostgreSQL `public` schema to
native UUID columns before fixing route boundaries. The database is
development-only, so reset and reseed instead of supporting CUID-to-UUID data
conversion.

## Requirements

- Functional: every public-table primary key uses PostgreSQL `uuid`.
- Functional: every foreign key or persisted entity-reference column uses
  PostgreSQL `uuid`.
- Functional: Prisma-created application records receive UUID defaults.
- Functional: `profiles.id` remains supplied by Supabase Auth and uses native
  UUID without an application-generated default.
- Functional: development reset recreates the schema and dictionary data using
  UUIDs only.
- Non-functional: do not attempt to preserve current development CUID rows.

## Identifier Standard

```prisma
// Supabase Auth owns this value.
id String @id @db.Uuid

// Application/public-table records: database-generated UUID v4.
id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid

// Relations and persisted entity references.
passageId String @db.Uuid
```

Apply native UUIDs to:

- All model primary keys.
- All relation fields: `userId`, `passageId`, `sourceId`, `questionId`,
  `entryId`, and `senseId`.
- `DictionarySourceAudit.entityId`, because it stores a public-table entity ID.

Keep ordinary strings unchanged:

- `cacheKey`, `normalizedKey`, `stripeCustomerId`, language codes, provider
  names, learner content, and UI-only/result/question-option IDs.

## Related Code Files

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/*_normalize_public_ids_to_uuid/migration.sql`
- Modify: `supabase/migrations/enable_rls.sql`
- Modify: `prisma/seed-dictionary.ts`
- Modify as needed: dictionary dataset generation/validation scripts
- Modify: `docs/database/erd.md`
- Modify: `docs/database/data-dictionary.md`

## Implementation Steps

1. Change every public-table primary key to native `@db.Uuid`.
2. Use database-side `gen_random_uuid()` defaults for application-owned record
   IDs; keep `UserProfile.id` without a default because Supabase Auth supplies
   it.
3. Change every relation and persisted entity-reference field to `@db.Uuid`.
4. Generate a migration with `--create-only`; review native UUID columns,
   defaults, foreign-key order, and required `pgcrypto` support.
5. Update RLS policies from text-cast comparisons to native UUID comparisons.
6. Reset the development database and replay Prisma migrations.
7. Reapply and verify the Supabase RLS migration/policies after reset.
8. Regenerate Prisma Client, reseed dictionary data, and validate the seed.
9. Verify no public identifier column remains `TEXT` and no generated persisted
   record uses CUID.

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

- [ ] Every public-table PK/FK/entity-reference identifier is PostgreSQL
  `uuid`.
- [ ] Application-owned IDs have database UUID defaults.
- [ ] `profiles.id` accepts Supabase Auth UUIDs without generating a replacement.
- [ ] RLS policies compare native UUID values without `::text`.
- [ ] Development reset, Prisma migration replay, and RLS policy reapplication
  succeed.
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
