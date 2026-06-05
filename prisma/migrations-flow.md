# Prisma Migration Flow

Migration pipeline across Neon database branches.

## Branch Mapping

Preview migrations are not applied to a shared database. Production migrations
run only after CI validates the exact pushed SHA.

| Git Branch    | Neon Branch    | GitHub Env   | Stage       |
| ------------- | -------------- | ------------ | ----------- |
| `feat/*`      | `development`  | —            | Local dev   |
| PRs           | —              | —            | Secretless CI validation |
| `main`        | `production`   | `production` | Production  |

## Stage 1 — Local (`development`)

```
edit schema.prisma
        ↓
pnpm exec prisma migrate dev --name <descriptive_name>
        ↓
test locally
        ↓
commit schema + migration files
        ↓
open PR
```

- `migrate dev` generates SQL, applies it, records in `_prisma_migrations`.
- Commit `schema.prisma` + the new `prisma/migrations/` folder.

## Stage 2 — Pull Request (CI validation)

GitHub Actions runs on `pull_request` and protected-branch `push` events:

```
PR opened / updated
        ↓
✓ schema.prisma changed? → migration file must be included
✓ added/renamed migration SQL required for schema changes
✓ migration SQL audited for plain PostgreSQL compatibility
✓ prisma validate passes
✓ lint, typecheck, tests pass
```

No migration is applied at this stage.

## Stage 3 — Preview

Preview database migration is intentionally disabled until isolated
`preview/pr-<number>` Neon branches and trusted same-repository PR gating are
implemented. This avoids recording unrelated PR migration histories in one
shared database and keeps fork/Dependabot PRs secretless.

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

- **Only `migrate dev` on `develop`.** Never on staging or production.
- **Only `migrate deploy` on staging and production.**
- **Commit migration files.** They are the source of truth.
- **Never edit applied migrations.** Create a new one to correct issues.
- **Schema change without migration = CI failure.**

## Future: Per-Branch DB

When needed, each PR preview can get its own Neon branch:

1. GitHub Actions creates a `preview/pr-<number>` Neon branch per trusted
   same-repository PR.
2. `DATABASE_URL` is set dynamically per PR.
3. Branch is cleaned up when PR is closed.

This is not implemented yet. Shared PR migration databases are not allowed.

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
