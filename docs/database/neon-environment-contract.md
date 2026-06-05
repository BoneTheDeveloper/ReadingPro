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
- Review deployments can be restricted to trusted same-repository branches before
  development provider secrets are exposed.

If any gate is unavailable, production migration and deployment are blocked.

## Branch Topology

| Branch | Parent | Lifecycle | Data policy |
|---|---|---|---|
| `production` | Neon project root | Persistent and protected | Production data |
| `development` | `production` during development-only period | Persistent | Shared local and review data |

There is no staging database and no per-PR Neon preview branch in the current
strategy. Review deployments use the shared `development` branch. Copying
production PII into `development` is forbidden.

## Connection Ownership

| Context | `DATABASE_URL` pooled runtime | `DIRECT_URL` direct migration |
|---|---|---|
| Local `.env.local` | `development` | `development` |
| Vercel Development | `development` | Not injected |
| Trusted review runtime | `development` | Not injected |
| Vercel Production runtime | protected `production` | Not injected |
| Protected production migration job | Optional | protected `production` |

`DATABASE_URL` always means pooled application runtime access. `DIRECT_URL`
always means trusted Prisma migration access. Neon API credentials are
GitHub-only and must never be injected into application runtime.

## Provider Resource Boundaries

- Local, Vercel Development, and review use the Clerk development instance and
  development private Blob store.
- Vercel Production uses a separate Clerk production instance and private Blob
  store.
- `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`,
  `BLOB_READ_WRITE_TOKEN`, and `CRON_SECRET` are never client-visible.
- Production secrets live only in protected GitHub/Vercel environments.
- Fork and Dependabot PRs run secretless CI and receive no development or
  production provider secrets.

## Reset And Migration Rules

- Confirm the target branch name before applying migrations.
- `development` may be reset only while the team agrees it is disposable.
- Never reset `production`.
- Apply migrations using direct credentials only from trusted migration jobs.
- Application runtime must use pooled credentials and must not receive provider
  admin credentials.
- Seed canonical dictionary data only after the clean baseline succeeds.

## Local Setup

Keep `development` URLs in `.env.local`. If `vercel env pull` is needed, pull
into a separate file and preserve the explicit local database override:

```bash
vercel env pull .env.vercel-development
pnpm exec prisma validate
```

Never commit connection strings or provider secrets.
