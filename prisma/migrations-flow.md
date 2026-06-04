# Prisma Migration Flow

Migration pipeline across Neon database branches.

## Branch Mapping (MVP)

All preview branches share the staging database. Per-branch DB will be added later.

| Git Branch    | Neon Branch    | GitHub Env   | Stage       |
| ------------- | -------------- | ------------ | ----------- |
| `feat/*`      | `develop`      | —            | Local dev   |
| PRs (any)     | `staging`      | `preview`    | Preview     |
| `main`        | `production`   | `production` | Production  |

## Stage 1 — Local (`develop`)

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

GitHub Actions runs on `pull_request`:

```
PR opened / updated
        ↓
✓ schema.prisma changed? → migration file must be included
✓ migration SQL reviewed (printed in CI logs)
✓ prisma validate passes
✓ lint, typecheck, tests pass
```

No migration is applied at this stage.

## Stage 3 — Preview (staging DB)

GitHub Actions runs on `pull_request` (parallel with CI):

```
PR opened / updated
        ↓
pnpm db:migrate:deploy  (against staging Neon branch)
        ↓
prisma migrate status
        ↓
Vercel deploys preview
```

- All PRs share the staging database.
- `migrate deploy` is idempotent — safe to re-run.
- Vercel preview deploys in parallel.

## Stage 4 — Production

GitHub Actions runs on `push to main` (manual approval required):

```
merge to main
        ↓
⏸ manual approval (GitHub environment protection rule)
        ↓
Neon branch restore point created
        ↓
pnpm db:migrate:deploy  (against production Neon branch)
        ↓
prisma migrate status
        ↓
curl Vercel deploy hook → production deploy starts
        ↓
post-deploy /api/health check
```

- Manual approval gate prevents accidental production migrations.
- Restore point (Neon branch snapshot) enables fast rollback.
- Vercel deploy triggered only after migration succeeds.

## Key Rules

- **Only `migrate dev` on `develop`.** Never on staging or production.
- **Only `migrate deploy` on staging and production.**
- **Commit migration files.** They are the source of truth.
- **Never edit applied migrations.** Create a new one to correct issues.
- **Schema change without migration = CI failure.**

## Future: Per-Branch DB

When needed, each PR preview can get its own Neon branch:

1. Neon auto-creates a branch per PR (via Neon-Vercel integration or GitHub Action).
2. `DATABASE_URL` is set dynamically per PR.
3. Branch is cleaned up when PR is closed.

This is not implemented yet. All PRs share the staging DB for simplicity.

## GitHub Setup

### Environments (Settings → Environments)

1. **`preview`** — auto-deploy, no approval needed
   - Secrets: `DATABASE_URL`, `DIRECT_URL` → staging Neon branch endpoint
2. **`production`** — enable "Required reviewers" for manual approval
   - Secrets: `DATABASE_URL`, `DIRECT_URL` → production Neon branch endpoint
   - Secrets: `NEON_API_KEY`, `NEON_PROJECT_ID` → for restore points
   - Secrets: `VERCEL_DEPLOY_HOOK` → Vercel deploy hook URL for `main`
   - Secrets: `PRODUCTION_URL` → app domain for health check

### Vercel Settings

- Disable auto-deploy for `main` branch (Settings → Git).
- Create a deploy hook for `main` (Settings → Git → Deploy Hooks).
