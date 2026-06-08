# Environment Variables

This page is the source of truth for tracked environment-variable names. Keep it
aligned with `.env.example`, deployment scripts, and direct `process.env` usage.

## App

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical URL for redirects/absolute links. |
| `OPENAI_API_KEY` | Yes for AI | Used by AI features. |

## Operational Overrides

These are not required local development variables and should not be copied into
ordinary app environment setup by default.

| Variable | Required | Notes |
|----------|----------|-------|
| `APP_COMMIT_SHA` | Deploy/CI optional | Custom commit SHA override for `/api/health`; Vercel should normally use `VERCEL_GIT_COMMIT_SHA`. |
| `LOG_LEVEL` | Runtime optional | Temporary log verbosity override; omit for normal local, preview, and production defaults. |

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

## Build, Test, And Performance

These variables are not normal app setup. Keep their primary instructions in the
tool-specific docs linked below.

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_DIST_DIR` | Optional | Custom Next.js build directory for performance builds. See `tests/performance/README.md`. |
| `PRISMA_QUERY_METRICS` | Performance only | Enables Prisma query metrics instrumentation when set to `1`. See `tests/performance/README.md`. |
| `TRANSLATE_PERFORMANCE_FIXTURES` | Performance only | Enables `/api/test/translate-performance-fixtures` outside production when set to `1`. See `tests/performance/README.md`. |
| `DICTIONARY_PERFORMANCE_FIXTURES` | Performance only | Enables `/api/test/dictionary-performance-fixtures` outside production when set to `1`. See `tests/performance/README.md`. |
| `PERFORMANCE_BASE_URL` | Performance only | External app URL for performance benchmarks. See `tests/performance/README.md`. |
| `E2E_BASE_URL` | E2E/performance only | External app URL for Playwright or performance runners. See `playwright/README.md` and `tests/performance/README.md`. |
| `E2E_AUTH_COOKIE` | E2E/performance only | Auth cookie for authenticated browser/performance flows. See `tests/performance/README.md`. |
| `BENCHMARK_COOKIE` | Performance only | Alternate auth cookie for performance benchmarks. See `tests/performance/README.md`. |
| `E2E_TEST_USER_EMAIL` | E2E helper only | Test user email for Playwright setup/helper scripts. See `playwright/README.md`. |
| `E2E_TEST_USER_PASSWORD` | E2E helper only | Test user password for Playwright setup/helper scripts. See `playwright/README.md`. |
| `SCREENSHOT_PATH` | Screenshot helper only | Target path for authenticated screenshot helper. See `playwright/README.md`. |
| `SCREENSHOT_NAME` | Screenshot helper only | Screenshot filename stem. See `playwright/README.md`. |
| `SCREENSHOT_DIR` | Screenshot helper only | Screenshot output directory. See `playwright/README.md`. |
| `RESET_CONFIRM` | Local destructive DB helper only | Must be `true` for reset helper; never set in production. See `prisma/migrations-flow.md`. |
| `PRODUCTION_URL` | Deploy verification only | Bare production host used by `scripts/database/verify-production-deploy-config.mjs`. See `docs/Operations/deployment-runbook.md`. |

## Platform-Provided

| Variable | Provider | Notes |
|----------|----------|-------|
| `NODE_ENV` | Node/Next.js | Runtime mode guard. Production-only routes and local storage checks depend on it. |
| `NEXT_RUNTIME` | Next.js | Selects node or edge Sentry instrumentation module. |
| `VERCEL_ENV` | Vercel | Selects preview vs production Blob adapter behavior outside local development. |
| `VERCEL_GIT_COMMIT_SHA` | Vercel | Fallback commit value returned by `/api/health`. |
| `CI` | CI provider | Enables CI-specific behavior such as source-map upload logging and single-worker test mode. |

## Current Route-Level Env Usage

Product routes should not read Clerk, Neon, Blob, Sentry, or provider secrets
directly. Current route-level env reads are limited to operational guards:

| Route | Variables | Purpose |
|-------|-----------|---------|
| `GET /api/health` | `APP_COMMIT_SHA`, `VERCEL_GIT_COMMIT_SHA` | Return deployment commit metadata only. |
| `GET /api/local-blob/[pathname]` | `NODE_ENV` | Disable local file serving outside development. |
| `/api/test/translate-performance-fixtures` | `TRANSLATE_PERFORMANCE_FIXTURES`, `NODE_ENV` | Enable authenticated performance fixtures outside production only. |
| `/api/test/dictionary-performance-fixtures` | `DICTIONARY_PERFORMANCE_FIXTURES`, `NODE_ENV` | Enable authenticated performance fixtures outside production only. |

## CI/Provider Secrets

Neon API and Vercel deployment tokens are CI-only. Do not inject them into Next.js runtime.
