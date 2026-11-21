---
title: Implement Prisma to raw SQL migration
date: 2026-11-21
summary: "Moved the app from Prisma to pg raw SQL with Flyway and Docker Postgres in six committed phases; tests, build and an HTTP smoke run pass."
---

# Implement Prisma to raw SQL migration

## What happened
Implemented `plans/261121-0352-prisma-to-raw-sql-flyway/` on `bone/refactor/prisma-to-raw-sql`, one commit per phase (5f377b0 to 3aeb900).

- Phase 1: `compose.yaml` (Postgres 17.12, Flyway 11.20.3) and `db/migrations/V1__init.sql`. A schema diff against a Prisma reference dump shows only the intended changes (`reports/schema-diff.md`).
- Phase 2: `src/server/lib/db.ts` (pool, `withTransaction`, `isUniqueViolation`) and a Vitest harness that refuses any non-local `DATABASE_URL`.
- Phase 3: Better Auth on the shared pool through its Kysely adapter, plus a new `profile` module.
- Phases 4 and 5: repositories for passage, artifact, chat, vocabulary items, sets and review.
- Phase 6: Prisma removed, README "Database" section added.

Surprises:
- On SELinux (Fedora), Flyway saw "No migrations found" until the bind mount got `:z`.
- The agent shell cannot use the Docker socket, so verification ran through a rootless Podman API socket via `DOCKER_HOST`.
- `.github/workflows/ci.yml` still ran `prisma generate`, which the plan missed. That step was removed.
- In better-auth 1.7.6, `internalAdapter.createUser` requires a provisioning source.
- In production, the session cookie carries the `__Secure-` prefix even on http.
- `pnpm why` still lists `prisma` and `@prisma/client`, only as optional peers of better-auth that pnpm keeps from the old lockfile. Dedupe, update, overrides and manual removal all failed to drop them; only a fresh lockfile does, at the cost of several hundred version changes.

## Decision
- The two optional peers stay. Their builds are set to `false` in `pnpm-workspace.yaml`. This is documented in `reports/verification-report.md`.
- `.env` (Neon) was left untouched. Tests and smoke runs used a local `DATABASE_URL` override.
- Missing passages, artifacts and sets on update or delete now return 404, where they used to return 500.

## Next steps
- The user runs the Google and AI parts of the smoke checklist.
- The user points `.env` at the local database.
- Production Flyway runs only after an explicit go-ahead and a `pg_dump` backup.

> Historical work record — not durable authority. Prefer docs/specs/ADRs for current decisions.
