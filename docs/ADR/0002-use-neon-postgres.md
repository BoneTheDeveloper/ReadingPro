# ADR 0002: Use Neon Postgres

## Status

Accepted.

## Context

The app needs production PostgreSQL, branchable environments, and compatibility with Prisma migrations.

## Decision

Use Neon PostgreSQL with separate development, preview, and production contexts. Runtime uses pooled `DATABASE_URL`; migrations use direct `DIRECT_URL` only in trusted contexts.

## Consequences

- Postgres is the shared persistence layer for app data, dictionary data, and progress.
- Neon branches support preview verification.
- Migration workflow must distinguish runtime and migration credentials.

## Alternatives Considered

- SQLite: useful for early MVP, not sufficient for production multi-user deployment.
- Managed Postgres on another provider: viable but weaker branch workflow for this project.
