# Deployment Runbook

## Pre-Deploy Checks

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm build
```

Run Playwright or targeted e2e tests for release-sensitive UI changes.

## Environment Checks

- Clerk keys match the target environment.
- `NEXT_PUBLIC_SITE_URL` matches the target public origin.
- `DATABASE_URL` points to the target Neon pooled connection.
- `DIRECT_URL` is not exposed to runtime except trusted migration job context.
- `BLOB_READ_WRITE_TOKEN` points to the target Blob store.
- Sentry source-map env vars are available only in CI.
- Performance fixture flags are unset in production.

## Automated Verification Helpers

Run the local deploy-config verifier with a bare production host before
promotion:

```bash
PRODUCTION_URL=app.example.com NEXT_PUBLIC_SITE_URL=https://app.example.com node scripts/database/verify-production-deploy-config.mjs
```

When checking production migrations, verify the direct Neon endpoint against the
production branch endpoint export:

```bash
DIRECT_URL=postgresql://... node scripts/database/verify-direct-url-endpoint.mjs
```

## Deploy Order

1. Deploy preview.
2. Run migrations against preview if schema changed.
3. Verify upload, study, translate, dictionary, chat, cards, and progress smoke flows.
4. Run production migration if needed.
5. Promote/deploy production.
6. Monitor logs and Sentry.

## Rollback Notes

- App rollback is separate from database rollback.
- Do not roll back code across incompatible schema changes without a reviewed DB mitigation.
- Blob uploads are external side effects and are not automatically rolled back.
