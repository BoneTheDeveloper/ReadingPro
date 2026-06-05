# Research Report: Prisma Migration Strategy

---
created: 2026-06-05 09:08 Asia/Ho_Chi_Minh
scope:
  - prisma/migrations-flow.md
  - prisma/migrations-guide.md
  - .github/workflows/ci.yml
  - .github/workflows/migrate.yml
---

## Executive Summary

Current strategy is mostly correct: create migrations only with `migrate dev` in
development, commit migration SQL, validate in CI, and apply production with
`migrate deploy` after approval. This matches current Prisma guidance.

Main risk: docs say PR validation applies no migrations, but CI can run
`pnpm db:migrate:deploy` for E2E when secrets exist. If those secrets point to a
shared branch, PR CI mutates shared migration history. That contradicts
`migrations-flow.md` and can serialize unrelated PR migration state into one DB.

Second risk: "restore point" wording is too soft. Current workflow creates a
Neon child branch from production before migration. That preserves a copy, but
rollback still needs an explicit restore/promote runbook and app compatibility
plan. Do not imply automatic fast rollback from migration failure.

## Research Methodology

- Sources consulted: 6 local files, 5 official docs pages.
- Date: 2026-06-05.
- Search terms: Prisma migrate deploy production, migrate dev shadow database,
  migrate status exit codes, Neon branch restore.
- Source priority: official Prisma docs, Neon API docs, repo workflows.

## Key Findings

### 1. Strategy Fit

Good:

- `migrations-flow.md` separates local, PR, preview, and production stages.
- `migrations-guide.md` says no `migrate dev` or `migrate reset` in staging/prod.
- Production workflow checks exact CI SHA through `workflow_run.head_sha`.
- Production workflow uses GitHub `environment: production`, which can enforce
  manual approval.
- Production workflow verifies Neon branch name before applying migrations.
- Prisma CLI is in `dependencies`, so CI/Vercel-style pruned installs can still
  run migrations.

Matches Prisma:

- Prisma says `migrate dev` is dev-only and uses a shadow database.
- Prisma says `migrate deploy` is for production/testing CI/CD and applies
  committed pending migrations.
- Prisma says `migrate deploy` does not detect drift, does not reset, does not
  generate artifacts, and does not use a shadow DB.
- Prisma says `migrate status` exits nonzero for unapplied, diverged, missing,
  connection-error, or failed migration states.

### 2. Main Mismatch: PR "No Apply" vs E2E Migration

Local docs:

- `prisma/migrations-flow.md:47` says no migration is applied at PR validation.
- `.github/workflows/ci.yml:90-95` applies `pnpm db:migrate:deploy` when E2E
  secrets exist.

Impact:

- If PR E2E secrets point at shared `development`, PR CI can mutate the shared DB.
- Fork PRs probably stay secretless, but same-repo PRs may still write.
- This undermines the stated preview-disabled posture.

Recommendation:

- Either update docs to explicitly say "unit CI is secretless; optional E2E may
  migrate the dedicated E2E DB only", or change CI so E2E migrations only run on
  a disposable isolated branch/database.
- Add an environment variable contract for E2E DB target, e.g.
  `E2E_DATABASE_BRANCH=ci/e2e` or `preview/pr-<number>`, and fail if target is
  `production` or `development`.

### 3. Production Rollback Language Is Too Optimistic

Local docs:

- `prisma/migrations-flow.md:70` says Neon branch restore point created.
- `prisma/migrations-flow.md:82` says restore point enables fast rollback.
- `.github/workflows/migrate.yml:52-62` creates a new branch from production.

Neon docs:

- Neon restore API restores a branch by source timestamp/LSN and can preserve the
  previous state under a name.

Impact:

- A child branch copy is useful, but it is not itself a production rollback.
- Rollback needs exact steps: restore production branch or repoint app to
  preserved branch, then verify app commit compatibility.
- Destructive migrations may still require forward-fix/data-repair instead of
  naive rollback.

Recommendation:

- Rename "restore point" to "pre-migration backup branch".
- Add rollback runbook: capture timestamp/branch ID, restore command/API,
  app deployment rollback compatibility, post-restore checks.

### 4. Missing Shadow DB Guidance For Neon Local Dev

Local docs:

- `prisma.config.ts:10-12` uses `DIRECT_URL`, no `shadowDatabaseUrl`.
- `migrations-guide.md` does not mention `SHADOW_DATABASE_URL`.

Prisma docs:

- `migrate dev` requires a shadow database.
- Cloud-hosted databases may need a manually configured shadow database.
- `shadowDatabaseUrl` belongs in `prisma.config.ts` for Prisma 7.

Impact:

- Local `migrate dev` can fail on Neon if the direct role cannot create/drop
  databases.
- Worse, a developer may work around it with `db push`, bypassing migration
  history.

Recommendation:

- Add `SHADOW_DATABASE_URL` to local setup if Neon cannot create the shadow DB.
- Add to `prisma.config.ts`:

```ts
datasource: {
  url: process.env.DIRECT_URL,
  shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
}
```

- Document: never set `SHADOW_DATABASE_URL` equal to `DIRECT_URL`.

### 5. CI Migration Validation Is Useful But Shallow

Current checks:

- Schema change requires an added/renamed migration SQL file.
- Migration SQL diff is printed for review.
- Prisma validate runs.

Gaps:

- No fresh replay in CI on an empty PostgreSQL/Neon branch.
- No generated SQL risk scanner for lock-heavy changes.
- Rename-only migration file can pass even if SQL does not match schema intent.

Recommendation:

- Keep current lightweight gate.
- Add a periodic or protected-branch replay gate against disposable empty DB:
  `pnpm db:migrate:deploy && pnpm exec prisma migrate status`.
- For production-affecting migrations, add a lock-risk audit. Prisma docs now
  point to pgfence for heavy-lock checks.

## Recommended Doc Changes

1. Fix `migrations-flow.md` branch label:
   - Current: "Only `migrate dev` on `develop`."
   - Better: "Only `migrate dev` on local developer-owned development DBs."
   - Reason: table uses `feat/* -> development`; no `develop` branch listed.

2. Clarify PR/E2E:
   - "PR migration validation does not apply migrations. Optional E2E may apply
     migrations only to a dedicated disposable E2E/preview DB."

3. Add Neon shadow DB note to `migrations-guide.md`:
   - `migrate dev` needs shadow DB.
   - Configure `SHADOW_DATABASE_URL` for cloud-hosted local dev if needed.
   - Never equal to target DB URL.

4. Replace rollback sentence:
   - Current: "Restore point enables fast rollback."
   - Better: "Pre-migration backup branch supports rollback, but rollback must
     follow the production restore runbook and app compatibility checks."

5. Add direct URL emphasis:
   - Migration jobs should use direct `DIRECT_URL`; runtime uses pooled
     `DATABASE_URL`.
   - Already covered in `docs/database/neon-environment-contract.md`; link it
     from both migration docs.

## Current Strategy Diagram

```mermaid
flowchart TD
  Local[Local dev DB] --> DevMigrate[prisma migrate dev]
  DevMigrate --> Commit[Commit schema + migration SQL]
  Commit --> PR[PR CI validation]
  PR --> Merge[Merge to main]
  Merge --> CI[CI validates pushed SHA]
  CI --> Approval[GitHub production approval]
  Approval --> Verify[Verify Neon production branch]
  Verify --> Backup[Create pre-migration backup branch]
  Backup --> Deploy[prisma migrate deploy]
  Deploy --> Status[prisma migrate status]
  Status --> Vercel[Trigger Vercel deploy hook]
  Vercel --> Health[/api/health commit check]
```
- migration SQL contains forbidden Supabase/RLS patterns
## Sources

- Prisma: Deploy database changes with Prisma Migrate - https://docs.prisma.io/docs/orm/prisma-client/deployment/deploy-database-changes-with-prisma-migrate
- Prisma: `migrate dev` - https://docs.prisma.io/docs/cli/migrate/dev
- Prisma: Shadow database - https://docs.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/shadow-database
- Prisma: Development and production - https://www.prisma.io/docs/orm/prisma-migrate/workflows/development-and-production
- Prisma: `migrate status` - https://docs.prisma.io/docs/cli/migrate/status
- Neon API: restore branch - https://api-docs.neon.tech/reference/restoreprojectbranch

## Next Steps

1. Update the two Prisma docs with the five doc changes above.
2. Decide whether CI E2E is allowed to mutate a DB; if yes, require dedicated
   disposable DB target verification.
3. Add `SHADOW_DATABASE_URL` support if local Neon `migrate dev` lacks CREATEDB.
4. Add production rollback runbook before real production data exists.

## Unresolved Questions

- What database do current CI E2E `DATABASE_URL` and `DIRECT_URL` secrets target?
- Does the Neon local migration role have CREATEDB, or does it need a manual
  shadow database?
- Is Vercel main auto-deploy already disabled, or only documented?
