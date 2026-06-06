# Migration Flow

## Canonical Rule Docs

Detailed Prisma migration rules live beside the Prisma schema and migrations:

- [../../prisma/migrations-flow.md](../../prisma/migrations-flow.md) - full production-safe migration flow.
- [../../prisma/migrations-guide.md](../../prisma/migrations-guide.md) - practical guide for changing `prisma/schema.prisma`.
- [../../prisma/SECURITY.md](../../prisma/SECURITY.md) - Prisma/Neon security model.

This `docs/` page is an architecture index only. Do not copy the full migration procedure here.

## Summary

- Local schema changes use the Neon `development` branch.
- CI validates migration files but does not apply production migrations.
- Production migrations run only through the trusted GitHub Actions migration/deploy workflow.
- Runtime app code uses pooled `DATABASE_URL`.
- Migration jobs use `DIRECT_URL` only in trusted contexts.
- Destructive changes require expand/contract planning.

## Related Architecture Docs

- [database-architecture.md](../Architecture/database-architecture.md)
- [neon-environment-contract.md](neon-environment-contract.md)
- [../Operations/production-migration-runbook.md](../Operations/production-migration-runbook.md)
