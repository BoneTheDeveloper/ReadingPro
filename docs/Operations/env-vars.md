# Environment Variables

## App

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical URL for redirects/absolute links. |
| `OPENAI_API_KEY` | Yes for AI | Used by AI features. |

## Clerk

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Browser-safe public key. |
| `CLERK_SECRET_KEY` | Yes | Server-side Clerk API key. |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Optional/currently reserved | Required when Clerk webhooks are enabled. |

## Database

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Pooled runtime Neon connection. |
| `DIRECT_URL` | Migrations only | Direct Neon connection; do not expose to app runtime. |

## Storage

| Variable | Required | Notes |
|----------|----------|-------|
| `BLOB_READ_WRITE_TOKEN` | Preview/production | Vercel Blob token. Local dev uses filesystem. |
| `CRON_SECRET` | If cleanup route exists | Secret for scheduled cleanup. |

## Observability

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Empty disables browser DSN. |
| `SENTRY_AUTH_TOKEN` | CI only | Source-map upload. |
| `SENTRY_ORG` | CI only | Source-map upload. |
| `SENTRY_PROJECT` | CI only | Source-map upload. |

## CI/Provider Secrets

Neon API and Vercel deployment tokens are CI-only. Do not inject them into Next.js runtime.
