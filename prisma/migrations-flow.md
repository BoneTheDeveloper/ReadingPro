# Prisma Migration Flow

Simple migration flow for a solo developer using two Neon branches.

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
  -> pnpm exec prisma migrate dev --name <verb>_<noun>
  -> test locally
  -> commit schema.prisma and prisma/migrations/*
  -> open PR or merge to main
```

Rules:

- Use `migrate dev` only on `development`.
- Name migrations with `<verb>_<noun>`, for example `add_user_roles` or
  `drop_legacy_sessions`.
- Never leave a migration with an auto-generated timestamp-only name.
- Commit every generated migration folder.
- Do not edit a migration after it has been applied anywhere shared.
- If a generated migration may delete data, stop and review the SQL before merge.

## 2. CI Checks Migration Files

CI is read-only for database schema. It does not run `migrate deploy` against the
shared `development` database.

CI checks:

```text
lint
typecheck
tests
schema.prisma changed? migration SQL must be included
existing migration SQL not rewritten unless explicit baseline reset marker exists
migration SQL diff printed for review
prisma validate
prisma migrate status against development
optional E2E against already-migrated development DB
```

If E2E runs, the `development` database must already have the needed migration
from your local `pnpm exec prisma migrate dev --name <verb>_<noun>` run.

`prisma migrate status` exits non-zero when committed migrations are still
pending on `development`. This fails loudly before E2E can run against a stale
schema.

## Pre-Deploy Checklist For Destructive Migrations

Before approving production deploy for a migration that drops data, renames
columns, changes required columns, or may lock large tables:

```text
confirm Neon point-in-time restore is available for production
create a named backup branch:
  neon branches create --name backup-pre-<migration-name>
record the backup branch ID in the PR description
```

## 3. Deploy Production

Production migration runs only from `.github/workflows/migrate.yml` after CI
passes on `main` or `master`.

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
available for `production`. For destructive changes, take a manual Neon backup
branch first.

## Hard Rules

- `development`: `pnpm exec prisma migrate dev --name <verb>_<noun>`
- `production`: `pnpm db:migrate:deploy`
- Never run `migrate dev`, `migrate reset`, or `db push` on production.
- Never put `DIRECT_URL`, Neon API keys, or Vercel tokens in runtime app env.
- Disable Vercel Git auto-deploy for production. GitHub Actions owns production
  deploys.
- If `prisma/migrations/` has a merge conflict, always resolve by re-running
  `migrate dev` on the `development` branch. Never manually edit migration SQL
  files to resolve git conflicts.

## Required GitHub Production Secrets

Keep these in the protected `production` environment:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEON_API_KEY`
- `NEON_PROJECT_ID`
- `NEON_PRODUCTION_BRANCH_ID`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `PRODUCTION_URL`
