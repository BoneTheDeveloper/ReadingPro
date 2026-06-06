# Deployment Architecture

## Hosting

The production target is Vercel. The app expects Vercel preview and production environments with separated secrets and backing services.

## Build

`pnpm build` runs Prisma client generation and Next.js build:

```text
prisma generate --generator client
next build
```

## Required Services

| Service | Local | Preview | Production |
|---------|-------|---------|------------|
| Clerk | Development instance | Development/preview keys | Production instance |
| Neon | Local/trusted dev DB | Preview branch/context | Production branch |
| Blob | Local filesystem | Preview Blob token | Production Blob token |
| Sentry | Optional DSN | Preview project/env | Production project/env |

## Production Gates

Before promoting:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test`
- `pnpm e2e` for release-sensitive UI flows
- `pnpm db:migrate:deploy` against the intended DB
- Verify env vars from [../Operations/env-vars.md](../Operations/env-vars.md)
- Verify deployment runbook from [../Operations/deployment-runbook.md](../Operations/deployment-runbook.md)

## Runtime Constraints

- Node engine is `24.x`.
- Package manager is `pnpm@11.3.0`.
- Runtime app code uses `DATABASE_URL`, not `DIRECT_URL`.
- CI-only credentials must not be exposed to the Next.js runtime.

