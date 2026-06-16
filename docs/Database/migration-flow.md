# Migration Flow

## Canonical Rule Docs

Detailed Prisma migration rules live beside the Prisma schema and migrations:

- [../../prisma/migrations-guide.md](../../prisma/migrations-guide.md) - full migration flow and practical guide for changing `prisma/schema.prisma`.
- [../../prisma/SECURITY.md](../../prisma/SECURITY.md) - Prisma/Neon security model.

This `docs/` page is an architecture index only. Do not copy the full migration procedure here.

## Summary

- Local schema changes use the Neon `development` branch.
- CI runs lint, typecheck, and tests only; it does not validate or apply migrations.
- Production migrations are applied manually from local using `pnpm db:migrate:deploy:prod` (`.env.prod`).
- Runtime app code uses pooled `DATABASE_URL`.
- Migration jobs use `DIRECT_URL` only in trusted contexts.
- Destructive changes require expand/contract planning.

## Related Architecture Docs

- [database-architecture.md](../Architecture/database-architecture.md)
- [neon-environment-contract.md](neon-environment-contract.md)
- [../Operations/production-migration-runbook.md](../Operations/production-migration-runbook.md)
