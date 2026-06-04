# Prisma Migration Flow

Four-stage migration pipeline across Neon database branches.

## Branch Mapping

| Git Branch    | Neon Branch    | Stage       |
| ------------- | -------------- | ----------- |
| `feat/*`      | `develop`      | Local dev   |
| `staging`     | `staging`      | Staging     |
| `main`        | `production`   | Production  |

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
open PR → development
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
✓ db:migrate:audit (plain PostgreSQL check)
✓ app tests pass
```

- No migration is applied to any database at this stage.
- CI fails if schema changes without a migration file.

## Stage 3 — Staging / development DB

GitHub Actions runs on `push to development`:

```
PR merged → development
        ↓
pnpm db:migrate:deploy  (against development Neon branch)
        ↓
prisma migrate status
        ↓
seed / dictionary validation
        ↓
Vercel preview deploys
```

- `migrate deploy` applies pending migrations only.
- Smoke tests and seed checks validate the new schema.
- Only approve production migration if everything passes here.

## Stage 4 — Production

GitHub Actions runs on `push to main` (manual approval required):

```
development → main merge
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
- Post-deploy health check catches deployment issues.

## Key Rules

- **Only `migrate dev` on `develop`.** Never on staging or production.
- **Only `migrate deploy` on staging and production.**
- **Commit migration files.** They are the source of truth.
- **Never edit applied migrations.** Create a new one to correct issues.
- **Schema change without migration = CI failure.**

## GitHub Setup

### Environments (Settings → Environments)

1. **`staging`** — auto-deploy, no approval needed
   - Secrets: `DATABASE_URL`, `DIRECT_URL` → `development` Neon branch endpoint
2. **`production`** — enable "Required reviewers" for manual approval
   - Secrets: `DATABASE_URL`, `DIRECT_URL` → `production` Neon branch endpoint
   - Secrets: `NEON_API_KEY`, `NEON_PROJECT_ID` → for restore points
   - Secrets: `VERCEL_DEPLOY_HOOK` → Vercel deploy hook URL for `main`
   - Secrets: `PRODUCTION_URL` → app domain for health check

### Vercel Settings

- Disable auto-deploy for `main` branch (Settings → Git).
- Create a deploy hook for `main` (Settings → Git → Deploy Hooks).

### Neon

- `development` branch: auto-reset or rebase from `production` as needed.
- Production restore points are ephemeral Neon branches — delete after confirming stability.
