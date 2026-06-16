# Prisma Migration Guide

Single source of truth for changing the database schema. Solo-dev flow on Neon +
Prisma 7. CI validates migration files but never touches a database. You apply
migrations to `development` and to `production` yourself, from your laptop.

## Mental Model

| Context | Neon branch | Env file | Command | Who applies |
|---|---|---|---|---|
| Local dev | `development` | `.env.local` | `pnpm db:migrate:dev` | You |
| Production | `production` | `.env.prod` | `pnpm db:migrate:deploy:prod` | You (manual) |
| CI | none | none | validate only | No DB writes |

`prisma.config.ts` loads `.env.local` by default. The `:prod` scripts set
`PRISMA_ENV_FILE=.env.prod` so the same CLI points at the production branch.
There is no staging database and no per-PR database branch.

## 1. Dev Schema Change

1. Point `.env.local` at the Neon `development` branch (`DATABASE_URL` pooled,
   `DIRECT_URL` direct).
2. Edit `prisma/schema.prisma`.
3. Format and validate:

   ```bash
   pnpm exec prisma format
   pnpm exec prisma validate
   ```

4. Create and apply the migration to `development`:

   ```bash
   pnpm db:migrate:dev --name <verb>_<noun>   # e.g. add_reading_goal
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

Rules:

- Name migrations `<verb>_<noun>`. Never leave a timestamp-only name.
- Commit every generated migration folder.
- Do not edit a migration after it has been applied to any shared database.
- If `prisma/migrations/` has a git conflict, resolve by re-running
  `migrate dev` on `development`. Never hand-edit migration SQL to fix conflicts.

## 2. Update Production From Local

CI does **not** migrate. You apply to production yourself with the `:prod`
scripts. Treat every run as destructive until `\conninfo` proves the target.

1. Populate `.env.prod` (never commit it) from the Vercel/Neon console:

   ```
   DATABASE_URL=...   # pooled, production branch
   DIRECT_URL=...     # direct, production branch
   ```

2. **Confirm the target branch before writing anything:**

   ```bash
   set -a; . ./.env.prod; set +a
   psql "$DIRECT_URL" -c "\conninfo"   # must show the production endpoint/host
   ```

3. Apply and verify:

   ```bash
   pnpm db:migrate:deploy:prod
   pnpm db:migrate:status:prod         # expect "Database schema is up to date!"
   ```

4. Deploy the matching app version (Vercel) so code and schema move together.
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
pnpm exec prisma migrate dev --name <descriptive_name> --create-only
# review/adjust SQL, then:
pnpm exec prisma migrate dev
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

## 5. Environment Variables

### Vercel runtime app

Only the pooled `DATABASE_URL`. Never put `DIRECT_URL` or Neon/Vercel tokens in
runtime app env.

### Local `.env.local` (development) and `.env.prod` (production)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Pooled connection to the target branch |
| `DIRECT_URL` | Direct connection, used by migrations |

## Hard Rules

- `development`: `pnpm db:migrate:dev --name <verb>_<noun>` (`.env.local`).
- `production`: `pnpm db:migrate:deploy:prod` (`.env.prod`), only after
  `\conninfo` confirms the production branch.
- Never run `migrate dev`, `migrate reset`, or `db push` against production.
- Never commit `.env.prod`.
- Commit every generated migration folder; never edit applied migration SQL.
- Production migrations must be backward-compatible; use expand/contract for
  destructive changes.
