# Prisma Migration Guide

Single source of truth for changing the database schema. Solo-dev flow on Neon +
Prisma 7. CI runs lint, typecheck, and tests only — it does not validate or
apply migrations. You apply migrations to `development` and to `production`
yourself, from your laptop.

## Mental Model

| Context | Neon branch | Env file | Command 
|---|---|---|---|
| Local dev | `development` | `.env.local` | `pnpm db:migrate:dev` 
| Production | `production` | `.env.prod` | `pnpm db:migrate:deploy:prod` 


`prisma.config.ts` loads `.env.local` by default. The `:prod` scripts set
`PRISMA_ENV_FILE=.env.prod` so the same CLI points at the production branch.
There is no staging database and no per-PR database branch.

## 1. Dev Schema Change

1. Edit the relevant domain file under `prisma/schema/` (multi-file schema).
2. Format and validate:

   ```bash
   pnpm exec prisma format
   pnpm exec prisma validate
   ```

3. Create and apply the migration to `development`:

   ```bash
   pnpm db:migrate:dev --name <verb>_<noun>   # e.g. add_reading_goal
   ```

4. Review the generated SQL in `prisma/migrations/`.
5. Run local checks:

   ```bash
   pnpm run db:generate
   pnpm run typecheck
   pnpm run lint
   pnpm run test
   ```

6. Commit the changed `prisma/schema/*.prisma` file(s) and the new `prisma/migrations/*` folder.

Rules:

- Name migrations `<verb>_<noun>`. Never leave a timestamp-only name.
- Commit every generated migration folder.
- Do not edit a migration after it has been applied to any shared database.
- If `prisma/migrations/` has a git conflict, resolve by re-running
  `migrate dev` on `development`. Never hand-edit migration SQL to fix conflicts.

## 2. Update Production From Local


1. Apply and verify:

   ```bash
   pnpm db:migrate:deploy:prod
   pnpm db:migrate:status:prod         # expect "Database schema is up to date!"
   ```

2. Deploy the matching app version (Vercel) so code and schema move together.
   Production migrations must be backward-compatible with the currently deployed
   app: new code must not require an unapplied change, and old code must keep
   working against the new schema.

Inspect production data when needed: `pnpm db:studio:prod`.

## 3. Risky / Destructive Changes

For dropping/renaming columns or tables, `NOT NULL` additions, large backfills
or indexes, FK changes, or unique constraints:

### Expand / contract over multiple deploys

```text
Deploy 1 — expand:   add new column/table, keep the old one alive
Deploy 2 — migrate:  ship code that uses the new column/table
Deploy 3 — contract: remove the old column/table once code no longer references it
```

### Create the migration without applying, to review SQL first

```bash
pnpm db:migrate:dev --name <descriptive_name> --create-only
# review/adjust SQL, then:
pnpm db:migrate:dev
```

### Dry-run against a temporary Neon branch

```bash
neon branches create --name dry-run-<migration> --parent production
# point .env.prod at the dry-run branch, run db:migrate:deploy:prod, smoke test
neon branches delete dry-run-<migration>
```

Before a destructive production run, confirm Neon point-in-time restore is
available and create a manual backup branch:

```bash
neon branches create --name backup-pre-<migration>
```

## 4. Reset And Baseline

### Development reset (deletes all dev data — never on production)

```bash
pnpm exec prisma migrate reset --force
pnpm run db:generate
pnpm db:seed:dictionary
```

The local replay helper requires `RESET_CONFIRM=true` and refuses to run with
`NODE_ENV=production`. Keep that guard out of any shared/runtime env.

### Baseline an existing database

When a database already has the schema and you only need Prisma to record a
migration as applied (e.g. after squashing migrations):

```bash
PRISMA_ENV_FILE=.env.prod pnpm exec prisma migrate resolve --applied <migration_name>
```

For a clean/empty database, use `db:migrate:deploy:prod` instead.
