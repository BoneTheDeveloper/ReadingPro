# Prisma Migration Guide

Reference for creating, reviewing, and deploying Prisma migrations.

This project has two database states:

- `development` for local development and review deployments.
- `production` for protected production.

There is no staging database.

## Before Changing The Schema

1. Confirm which database environment you are targeting.
2. Back up data when the change may be destructive.
3. Review current migration status:

```bash
pnpm exec prisma validate
pnpm exec prisma migrate status
```

Never paste or commit database credentials.

## Create A Development Migration

1. Edit `prisma/schema.prisma`.
2. Format and validate:

```bash
pnpm exec prisma format
pnpm exec prisma validate
```

3. Create and apply the migration:

```bash
pnpm exec prisma migrate dev --name <descriptive_name>
```

4. Review the generated SQL in `prisma/migrations/`.
5. Regenerate Prisma Client:

```bash
pnpm run db:generate
```

## Create Without Applying

```bash
pnpm exec prisma migrate dev --name <descriptive_name> --create-only
```

Review the generated SQL, and only edit when needed for column renames, data migration, or custom SQL (for example indexes/triggers), then apply:

```bash
pnpm exec prisma migrate dev
```

## Deploy Migrations (Production)

```bash
pnpm exec prisma migrate deploy
pnpm run db:generate
pnpm exec prisma migrate status
```

Never use `migrate dev` or `migrate reset` in production. Review deployments use
the shared `development` branch and must not run `migrate deploy`.

## Reset A Development Database

Deletes all data and replays migration history. **Never run against production.**

```bash
pnpm exec prisma migrate reset --force
pnpm run db:generate
pnpm db:seed:dictionary
```

## Baselining An Existing Database

When deploying a migration to a database whose schema already matches:

```bash
pnpm exec prisma migrate resolve --applied <migration_name>
```

Only use this when the schema already exists in the database. For clean databases, use `migrate deploy`.

## Review Checklist

Before applying any migration:

- Unexpected table or column deletions
- Data loss from type changes or new required columns
- Missing defaults for existing rows
- Incorrect foreign-key or cascade behavior
- Dropped or recreated indexes
- Operations that may lock large tables

Do not edit an already-applied migration. Create a new one to correct it.

## Verify After Applying

```bash
pnpm exec prisma validate
pnpm exec prisma migrate status
pnpm run db:generate
pnpm run typecheck
pnpm run lint
```

Then test affected CRUD workflows and run related automated tests.
