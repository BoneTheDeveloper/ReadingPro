# Prisma Migration Guide

Use this guide when changing `prisma/schema.prisma`.

## Mental Model

- `development` is for local work and review.
- `production` is for real users.
- CI validates migration files but does not apply them.
- Production migrations run only through GitHub Actions.

## Local Schema Change

1. Point `.env.local` at the Neon `development` branch.
2. Edit `prisma/schema.prisma`.
3. Format and validate:

```bash
pnpm exec prisma format
pnpm exec prisma validate
```

4. Create and apply the migration to `development`:

```bash
pnpm db:migrate:dev
```

Use a name when helpful:

```bash
pnpm exec prisma migrate dev --name add_reading_goal
```

5. Review the generated SQL in `prisma/migrations/`.
6. Run local checks:

```bash
pnpm run db:generate
pnpm run typecheck
pnpm run lint
pnpm run test
```

7. Commit `prisma/schema.prisma` and the new `prisma/migrations/*` folder.

## Safer SQL Review For Risky Changes

For deletes, renames, required columns, or large tables, create the migration
without applying first:

```bash
pnpm exec prisma migrate dev --name <descriptive_name> --create-only
```

Review and adjust the SQL if needed, then apply to `development`:

```bash
pnpm exec prisma migrate dev
```

## Production Deploy

Do not deploy production manually from your laptop.

After merge to `main`, `.github/workflows/migrate.yml` does this:

```text
approval
verify production branch
build exact Vercel artifact
pnpm db:migrate:deploy
pnpm exec prisma migrate status
vercel deploy --prebuilt --prod
health check deployed commit
```

Before approving destructive changes, confirm Neon point-in-time restore is
available. If the change is high risk, create a manual Neon backup branch first.

## Development Reset

This deletes all data in the target database. Use only on `development`.

```bash
pnpm exec prisma migrate reset --force
pnpm run db:generate
pnpm db:seed:dictionary
```

Never run this against production.

## Existing Database Baseline

Only use this when a database already has the schema and you need Prisma to mark
a migration as applied:

```bash
pnpm exec prisma migrate resolve --applied <migration_name>
```

For a clean database, use `migrate deploy` instead.

## Quick Checklist

- `migrate dev` only on `development`.
- `migrate deploy` only in trusted production workflow.
- No `db push` for shared or production schema.
- No edits to already-applied migration SQL.
- Schema change must include a migration folder.
- Review SQL before approving production.
