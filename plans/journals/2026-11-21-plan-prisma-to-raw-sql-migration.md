---
title: Plan Prisma to raw SQL migration
date: 2026-11-21
summary: "Planned the move from Prisma to pg raw SQL with Flyway, Docker Postgres and Better Auth on the shared pool."
---

# Plan Prisma to raw SQL migration

## What happened
Planned the migration from Prisma to node-postgres raw SQL on branch `bone/refactor/prisma-to-raw-sql`.
Plan: `plans/261121-0352-prisma-to-raw-sql-flyway/` (6 phases, about 3 days).

Scouting found three things Prisma was hiding:
- `ProcessingStatus` is stored lowercase in the DB, and Prisma maps it to `PENDING`/`COMPLETED`/`FAILED`.
- Every timestamp is `TIMESTAMP(3)` with no time zone. `pg` would read these 7 hours off on a machine set to Asia/Bangkok.
- Prisma throws `P2025` (a 500) when an update or delete matches no row. Raw SQL silently affects 0 rows.

## Decision
- Better Auth uses the shared `pg.Pool` through its built-in Kysely adapter, with `modelName: "User"`.
- Flyway owns the whole schema, including the auth tables. Never use `npx auth migrate`.
- Production has no data to keep, so `V1__init.sql` is the final schema: `timestamptz` and uppercase `ProcessingStatus`.
- Vitest integration tests run against `readingpro_test` in Docker. A `pg_enum` test replaces `enum-sync.ts`.
- Local Postgres binds `127.0.0.1:54329`, because 5432 and 5433 are already in use.
- Repositories contain only SQL and return null or a boolean. Services own `AppError` and transactions.

## Next steps
Run `/ak:cook plans/261121-0352-prisma-to-raw-sql-flyway/plan.md`. The Docker socket needs a docker-enabled shell.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
