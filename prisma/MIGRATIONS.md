# Prisma Migration Guide

Use this guide when changing the Prisma schema, creating migrations, resetting a
development database, or deploying migrations.

## Migration History

The migration history starts from a clean baseline (`00000000_init`) followed by
the canonical RLS migration (`00000001_enable_rls`). All tables use native UUID
types from the start. There is no incremental chain from older schemas.

## Before Changing The Schema

1. Confirm which database environment you are targeting.
2. Back up data when the change may be destructive.
3. Review the current migration status:

```bash
pnpm exec prisma validate
pnpm exec prisma migrate status
```

Never paste or commit database credentials.

## Create A Development Migration

1. Update `prisma/schema.prisma`.
2. Format and validate the schema:

```bash
pnpm exec prisma format
pnpm exec prisma validate
```

3. Create and apply a migration:

```bash
pnpm exec prisma migrate dev --name <migration_name>
```

4. Review the generated SQL in `prisma/migrations/`.
5. Regenerate Prisma Client:

```bash
pnpm run db:generate
```

Use a clear migration name that describes the schema change.

## Create A Migration Without Applying It

Use `--create-only` when the generated SQL needs review or manual adjustment:

```bash
pnpm exec prisma migrate dev --name <migration_name> --create-only
```

Review and edit the generated SQL before applying it:

```bash
pnpm exec prisma migrate dev
```

## Reset A Development Database

Resetting deletes all data and replays the complete migration history.
Never run this command against staging or production:

```bash
pnpm exec prisma migrate reset --force
pnpm run db:generate
```

After a reset, run seed commands to restore dictionary data:

```bash
pnpm db:seed:dictionary                # normalized split files
pnpm db:seed:dictionary small-test     # test fixture
```

Verify the application can create, read, update, and delete affected records.

## RLS and Seed Execution Order

After a fresh reset, migrations replay in order:

1. `00000000_init` — baseline schema (all tables, indexes, foreign keys)
2. `00000001_enable_rls` — RLS policies and handle_new_user trigger

Then run `pnpm db:seed:dictionary` to populate dictionary data.

The canonical RLS SQL lives at `prisma/rls/enable_rls.sql`. The migration copy
must stay byte-identical. See `prisma/rls/README.md` for maintenance workflow.

## Deploy Migrations

Use `migrate deploy` in staging, production, and other non-development
environments:

```bash
pnpm exec prisma migrate deploy
pnpm run db:generate
pnpm exec prisma migrate status
```

Never use `migrate dev` or `migrate reset` in production.

## Review Migration SQL

Before applying a migration, review it for:

- Unexpected table or column deletion.
- Data loss caused by type changes or new required columns.
- Missing defaults for existing rows.
- Incorrect foreign-key or cascade behavior.
- Dropped or recreated indexes and constraints.
- Operations that may lock large tables.
- Required data migration or backfill steps.

Do not edit an already-applied migration. Create a new migration to correct it.

## Verify A Migration

After applying a migration:

```bash
pnpm exec prisma validate
pnpm exec prisma migrate status
pnpm run db:generate
pnpm run typecheck
pnpm run lint
```

Then:

- Run affected automated tests.
- Verify the applied schema matches the intended change.
- Test affected create, read, update, and delete workflows.
- Confirm defaults, constraints, indexes, and relationships behave correctly.
- Run required seeds, backfills, or post-migration tasks.

## Troubleshooting

If a development migration fails:

1. Read the database and Prisma error before changing anything.
2. Inspect migration status and the generated SQL.
3. Fix the schema or unapplied migration.
4. Reset only when losing development data is acceptable.

If an applied migration is incorrect, create a corrective migration. Do not
rewrite migration history shared with other environments.

## Final Checklist

- The intended database environment was confirmed.
- The Prisma schema is formatted and valid.
- Generated migration SQL was reviewed.
- Destructive changes and data backfills were handled intentionally.
- Prisma Client was regenerated.
- Migration status is clean.
- Affected tests, type checking, and linting pass.
- Affected application workflows were verified.
