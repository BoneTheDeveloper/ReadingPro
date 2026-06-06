# Production Migration Runbook

## Canonical Rule Docs

Use the Prisma-owned docs for detailed migration procedure:

- [../../prisma/migrations-flow.md](../../prisma/migrations-flow.md)
- [../../prisma/migrations-guide.md](../../prisma/migrations-guide.md)
- [../../prisma/SECURITY.md](../../prisma/SECURITY.md)

This operations page summarizes the production checklist only.

## Before Running

- Confirm the migration SQL in `prisma/migrations/`.
- Confirm the migration has run successfully in preview.
- Confirm `DIRECT_URL` points to the production direct connection only in the trusted migration context.
- Confirm no destructive operation is hidden in generated SQL.

## Command

```bash
pnpm db:migrate:deploy
```

## After Running

- Run `pnpm db:generate` in build context if needed.
- Verify app health.
- Smoke test authenticated upload and dictionary/translation reads.
- Check Sentry and Vercel logs.

## Abort Conditions

- Migration includes unintended table drops.
- Runtime and migration URLs point to different intended environments.
- Preview verification failed.
- Required rollback path is unknown for a destructive change.
