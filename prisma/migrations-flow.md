# Prisma Migration Flow

Migration pipeline across Neon database branches.

## Branch Mapping

There is no staging database state. Local development and review deployments use
the same Neon `development` branch. Production migrations run only after CI
validates the exact pushed SHA.

| Git Branch / Context | Neon Branch   | GitHub Env   | Stage         |
| -------------------- | ------------- | ------------ | ------------- |
| `feat/*` local work  | `development` | —            | Local dev     |
| Review deployments   | `development` | —            | Review branch |
| PR CI                | —             | —            | Secretless CI validation |
| `main`               | `production`  | `production` | Production    |

## Stage 1 — Local + Review (`development`)

```
edit schema.prisma
        ↓
pnpm exec prisma migrate dev --name <descriptive_name>
        ↓
test locally
        ↓
commit schema + migration files
        ↓
open PR / review deployment uses development
```

- `migrate dev` generates SQL, applies it, records in `_prisma_migrations`.
- Commit `schema.prisma` + the new `prisma/migrations/` folder.
- Review deployments use the same `development` database state. They do not get
  an isolated migration history.
- Coordinate schema changes before running `migrate dev` because the
  `development` branch is shared.

## Stage 2 — Pull Request (CI validation)

GitHub Actions runs on `pull_request` and protected-branch `push` events:

```
PR opened / updated
        ↓
✓ schema.prisma changed? → migration file must be included
✓ added/renamed migration SQL required for schema changes
✓ migration SQL diff printed for review
✓ prisma validate passes
✓ lint, typecheck, tests pass
```

No migration is applied at this stage.

## Stage 3 — Review Branch

Review branches use the shared Neon `development` branch. CI still validates
migration files and schema shape, but it does not run `migrate deploy` for a
review branch.

This keeps the environment model simple:

- `development` for local and review.
- `production` for protected production.
- No `staging` database.
- No per-PR `preview/pr-<number>` database branches.

## Stage 4 — Production

GitHub Actions runs after the CI workflow succeeds for a `main` or `master`
push (manual approval required):

```
merge to main
        ↓
CI validates the exact pushed SHA
        ↓
⏸ manual approval (GitHub environment protection rule)
        ↓
verify Neon production branch ID/name
        ↓
Neon branch restore point created
        ↓
pnpm db:migrate:deploy  (against production Neon branch)
        ↓
prisma migrate status
        ↓
curl --fail-with-body Vercel deploy hook → production deploy starts
        ↓
post-deploy /api/health commit check
```

- Manual approval gate prevents accidental production migrations.
- Restore point (Neon branch snapshot) enables fast rollback.
- Vercel deploy is triggered only after migration succeeds, and the health check
  must report the expected deployed commit SHA.

## Key Rules

- **Only `migrate dev` on the shared `development` branch.** Never on production.
- **Only `migrate deploy` on production.**
- **Commit migration files.** They are the source of truth.
- **Never edit applied migrations.** Create a new one to correct issues.
- **Schema change without migration = CI failure.**

## GitHub Setup

### Environments (Settings → Environments)

1. **`production`** — enable "Required reviewers" for manual approval
   - Secrets: `DATABASE_URL`, `DIRECT_URL` → production Neon branch endpoint
   - Secrets: `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_PRODUCTION_BRANCH_ID` →
     for target verification and restore points
   - Secrets: `VERCEL_DEPLOY_HOOK` → Vercel deploy hook URL for `main`
   - Secrets: `PRODUCTION_URL` → app domain for health check

### Vercel Settings

- Disable auto-deploy for `main` branch (Settings → Git).
- Create a deploy hook for `main` (Settings → Git → Deploy Hooks).
