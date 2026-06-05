# Prisma Migration Flow

Production-safe migration flow for a solo developer using Neon, Prisma, GitHub
Actions, and Vercel.

## Database States

| Context | Neon branch | Who changes schema |
|---|---|---|
| Local dev and review | `development` | You, from local machine |
| CI | none | Checks files only |
| Production | `production` | GitHub Actions after approval |

There is no staging database and no per-PR database branch.

## 1. Create Migration Locally

```text
edit prisma/schema.prisma
  -> pnpm exec prisma format && pnpm exec prisma validate
  -> pnpm exec prisma migrate dev --name <verb>_<noun>
  -> review generated SQL in prisma/migrations/
  -> test locally
  -> commit schema.prisma and prisma/migrations/*
  -> open PR or merge to main
```

Rules:

- Use `migrate dev` only on `development`.
- Name migrations `<verb>_<noun>`, for example `add_user_roles`,
  `drop_legacy_sessions`. Never leave a timestamp-only name.
- Commit every generated migration folder.
- Do not edit a migration after it has been applied to any shared database.
- If a generated migration may delete data, stop and review the SQL before
  merge.

## 2. CI Checks Migration Files

CI is **read-only** for database schema. It does not run `migrate deploy` or
`migrate status` against any shared database.

CI checks:

```text
lint
typecheck
tests
schema.prisma changed? migration SQL must be included
existing migration SQL not rewritten unless explicit baseline reset marker exists
migration SQL diff printed for review
prisma validate
```

`prisma migrate status` against `development` is **not required** for every PR.
It may run as an optional non-blocking check on `main` after merge, but PR
correctness must not depend on whether the developer already applied the
migration to the shared `development` database.

## 3. Production Migration Safety

Production migrations must be **backward-compatible** with the currently
deployed app version. The new app code must not depend on a schema change that
has not been applied yet, and the old app code must continue to work against
the new schema.

### Destructive changes require expand/contract

Do not directly drop columns, rename columns, or make other breaking schema
changes in the same deploy that the new app code depends on. Use an
expand/contract strategy over multiple deploys:

```text
Deploy 1 — expand: add new column/table, keep old one alive
Deploy 2 — migrate: deploy code that uses the new column/table
Deploy 3 — contract: remove old column/table after code no longer references it
```

### Risky migration dry-run

There is no permanent staging database. For risky migrations, dry-run against a
temporary Neon branch first.

**Risky migrations include:**

- Dropping columns or tables
- Renaming columns
- Adding NOT NULL columns
- Large backfills
- Large indexes
- Foreign key changes
- Unique constraints

**Dry-run steps:**

```text
create temporary Neon branch from production
  -> pnpm db:migrate:deploy against temporary branch
  -> run smoke tests against temporary branch
  -> approve production deploy only after dry-run passes
  -> delete temporary branch
```

Use `neon branches create --name dry-run-<migration-name> --parent
production` and clean up after.

## 4. Deploy Production

Production migration runs only from `.github/workflows/migrate.yml` after CI
passes on `main`.

```text
merge to main
  -> CI passes
  -> GitHub production environment approval
  -> verify pushed SHA is still branch head
  -> verify Neon production branch ID/name
  -> verify DIRECT_URL points at production direct endpoint
  -> build Vercel artifact for exact SHA
  -> pnpm db:migrate:deploy
  -> prisma migrate status
  -> verify branch head again
  -> vercel deploy --prebuilt --prod
  -> /api/health confirms deployed commit SHA
```

Before approving a risky migration, confirm Neon point-in-time restore is
available for `production`. For destructive changes, create a manual Neon backup
branch first:

```text
neon branches create --name backup-pre-<migration-name>
record the backup branch ID in the PR description
```

## 5. Environment Variables

### Vercel runtime app

Only the pooled `DATABASE_URL`. Nothing else.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Pooled connection to the target branch |

Never put `DIRECT_URL`, `NEON_API_KEY`, or `VERCEL_TOKEN` in Vercel runtime
environment variables.

### GitHub production migration/deploy job

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled production connection |
| `DIRECT_URL` | Direct connection for migrations |
| `NEON_API_KEY` | Branch verification and dry-run |
| `VERCEL_TOKEN` | Prebuilt deploy |

### GitHub Production Secrets

- `DATABASE_URL`
- `DIRECT_URL`
- `NEON_API_KEY`
- `VERCEL_TOKEN`

### GitHub Production Variables

- `NEON_PROJECT_ID`
- `NEON_PRODUCTION_BRANCH_ID`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `PRODUCTION_URL`

## Hard Rules

- `development`: `pnpm exec prisma migrate dev --name <verb>_<noun>`
- `production`: `pnpm db:migrate:deploy`
- Never run `migrate dev`, `migrate reset`, or `db push` on production.
- Never put `DIRECT_URL`, Neon API keys, or Vercel tokens in runtime app env.
- Disable Vercel Git auto-deploy for production. GitHub Actions owns production
  deploys.
- Commit every generated migration folder.
- Do not edit a migration after it has been applied to any shared database.
- Production migrations must be backward-compatible with the currently deployed
  app. Use expand/contract for destructive changes.
- If `prisma/migrations/` has a merge conflict, resolve by re-running
  `migrate dev` on the `development` branch. Never manually edit migration SQL
  files to resolve git conflicts.
