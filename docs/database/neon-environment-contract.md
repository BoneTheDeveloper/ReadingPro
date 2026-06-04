# Neon Environment Contract

This document defines database branch ownership, connection-string exposure,
reset permissions, and production safeguards for the Clerk + Neon migration.

## Capability Gates

Do not migrate production data until all of these provider controls are
confirmed:

- The Neon plan supports protecting the `production` branch.
- The GitHub plan supports a protected production environment with a required
  reviewer and no self-approval.
- Vercel production variables and deployments can be restricted to the
  protected production workflow.
- Trusted same-repository PRs can be distinguished from forks and Dependabot
  before privileged preview jobs receive secrets.

If any gate is unavailable, production migration and deployment are blocked.

## Branch Topology

| Branch | Parent | Lifecycle | Data policy |
|---|---|---|---|
| `production` | Neon project root | Persistent and protected | Production data |
| `development` | `production` during development-only period | Persistent | Shared development baseline |
| `dev/luc` | `development` | Persistent local branch | Developer-owned disposable data |
| `preview/pr-<number>` | `production` during development-only period | Temporary per trusted PR | Disposable preview data |

Before real production user data exists, preview branches must switch to a
schema-only or sanitized parent. Copying production PII into previews is
forbidden.

Only GitHub Actions owns `preview/pr-<number>` creation and deletion. Disable
other automatic Neon preview-branch integrations to avoid duplicate branches.

## Connection Ownership

| Context | `DATABASE_URL` pooled runtime | `DIRECT_URL` direct migration |
|---|---|---|
| Local `.env.local` | `dev/luc` | `dev/luc` |
| Vercel Development | `development` | Not injected |
| Vercel Preview runtime | `preview/pr-<number>` | Not injected |
| Trusted preview migration job | Optional | `preview/pr-<number>` |
| Vercel Production runtime | protected `production` | Not injected |
| Protected production migration job | Optional | protected `production` |

`DATABASE_URL` always means pooled application runtime access. `DIRECT_URL`
always means trusted Prisma migration access. Neon API credentials are
GitHub-only and must never be injected into application runtime.

## Provider Resource Boundaries

- Local, Vercel Development, and Preview use the Clerk development instance and
  development private Blob store.
- Vercel Production uses a separate Clerk production instance and private Blob
  store.
- `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`,
  `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET` are never client-visible.
- Production secrets live only in protected GitHub/Vercel environments.
- Fork and Dependabot PRs run secretless CI and receive no privileged preview.

## Reset And Migration Rules

- Confirm the target branch name and emptiness before applying the clean
  baseline.
- `dev/luc` and temporary preview branches may be reset by their owner.
- `development` may be reset only while the team agrees it is disposable.
- Never reset `production`.
- Apply migrations using direct credentials only from trusted migration jobs.
- Application runtime must use pooled credentials and must not receive provider
  admin credentials.
- Seed canonical dictionary data only after the clean baseline succeeds.

## Local Setup

Keep `dev/luc` URLs in `.env.local`. If `vercel env pull` is needed, pull into a
separate file and preserve the explicit local database override:

```bash
vercel env pull .env.vercel-development
pnpm db:migrate:audit
pnpm exec prisma validate
```

Never commit connection strings or provider secrets.
