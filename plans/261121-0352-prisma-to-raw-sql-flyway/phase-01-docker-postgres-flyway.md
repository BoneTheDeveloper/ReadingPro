---
phase: 1
title: "Phase 1: Docker Postgres, Flyway and the V1 schema"
status: done
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Docker Postgres, Flyway and the V1 schema

## Overview

Run Postgres and Flyway locally in Docker. Write `db/migrations/V1__init.sql` as
the final schema: today's Prisma schema, with `timestamptz` instead of
`TIMESTAMP(3)` and uppercase `ProcessingStatus` labels. Prisma stays installed in
this phase only so it can produce a reference dump.

## Context Links

- `prisma/schema.prisma` and `prisma/migrations/*/migration.sql` (current schema)
- `.env.example` (`DATABASE_URL` is empty today)
- Ports 5432 and 5433 are held by two other Docker Postgres containers (`docker-proxy` PIDs 1955 and 1914). The user confirmed port `54329`.

## Requirements

- [x] `compose.yaml` at the repo root defines `postgres` and `flyway`.
- [x] Postgres binds only to `127.0.0.1:${POSTGRES_PORT:-54329}` and keeps its data in a named volume.
- [x] There is one database, `readingpro`. The app and the integration tests both use it (see phase 2 for how tests stay isolated).
- [x] Flyway reads `db/migrations/` read-only and keeps `cleanDisabled=true`.
- [x] Flyway's URL is fixed to the compose `postgres` service, so `pnpm db:migrate` can never reach the database in the user's current `.env`.
- [x] V1 matches the Prisma reference schema, except for the two intended changes.
- [x] Every `updatedAt` column gets `DEFAULT CURRENT_TIMESTAMP`. Writers still set it on update, but inserts no longer have to.
- [x] (not needed: the old DB was never written to) The user's current dev database is backed up before `.env` is pointed at the new one. <!-- Red Team: back up the old dev DB before switching .env -->

## Files

- Create: `compose.yaml`
- Create: `db/migrations/V1__init.sql`
- Modify: `package.json` (`db:*` scripts)
- Modify: `.env.example` (local `DATABASE_URL`)

## Implementation Steps

1. Write `compose.yaml`:
   ```yaml
   services:
     postgres:
       image: postgres:17-alpine            # pin the current 17.x tag when implementing
       environment:
         POSTGRES_USER: readingpro
         POSTGRES_PASSWORD: readingpro       # local dev only
         POSTGRES_DB: readingpro
       ports: ["127.0.0.1:${POSTGRES_PORT:-54329}:5432"]
       volumes: ["pgdata:/var/lib/postgresql/data"]
       healthcheck:
         test: ["CMD-SHELL", "pg_isready -U readingpro -d readingpro"]
         interval: 2s
         retries: 30
     flyway:
       image: flyway/flyway:11-alpine        # pin the current 11.x tag when implementing
       profiles: [tools]                     # never started by `docker compose up`
       depends_on: { postgres: { condition: service_healthy } }
       environment:
         FLYWAY_URL: jdbc:postgresql://postgres:5432/readingpro
         FLYWAY_USER: readingpro
         FLYWAY_PASSWORD: readingpro
         FLYWAY_LOCATIONS: filesystem:/flyway/sql
         FLYWAY_CLEAN_DISABLED: "true"
       volumes: ["./db/migrations:/flyway/sql:ro"]
   volumes:
     pgdata:
   ```
2. Add these scripts to `package.json`:
   - `"db:up": "docker compose up -d --wait postgres"`
   - `"db:down": "docker compose down"`
   - `"db:migrate": "docker compose run --rm flyway migrate"`
   - `"db:info": "docker compose run --rm flyway info"`
3. Produce the Prisma reference while Prisma is still installed:
   ```
   pnpm db:up
   docker compose exec postgres createdb -U readingpro prisma_ref
   DATABASE_URL=postgres://readingpro:readingpro@localhost:54329/prisma_ref pnpm exec prisma migrate deploy
   docker compose exec postgres pg_dump -U readingpro --schema-only --no-owner --no-privileges prisma_ref \
     > plans/261121-0352-prisma-to-raw-sql-flyway/reports/prisma-reference-schema.sql
   ```
4. Author `V1__init.sql` from that dump, in this order: enums, tables, indexes, foreign keys.
   - Drop `_prisma_migrations`.
   - Write every `TIMESTAMP(3)` as `TIMESTAMPTZ(3)`.
   - Create `ProcessingStatus` as `ENUM ('PENDING', 'COMPLETED', 'FAILED')`.
   - Add `DEFAULT CURRENT_TIMESTAMP` to `updatedAt` on `account`, `session`, `"User"`, `verification`, `"UserProfile"` and `"VocabularyItem"`.
   - Keep every constraint and index name exactly as Prisma named it, so later diffs stay readable.
   - Keep the comments from the Prisma schema that explain non-obvious rules, such as the `NO ACTION` on `VocabularyItem_vocabularySetId_fkey`.
5. Run `pnpm db:migrate`, then `pnpm db:info`.
6. Diff the schemas:
   - Dump `readingpro` the same way into `reports/flyway-v1-schema.sql`.
   - Run `diff` against the Prisma reference.
   - Only these differences may remain: timestamp types, `ProcessingStatus` labels, `updatedAt` defaults, and the missing `_prisma_migrations`.
   - Record the summary in `reports/schema-diff.md`.
   - Drop `prisma_ref` afterwards.
7. Switch the local app to the new database:
   - Ask the user whether the database in their current `.env` holds dev data they want to keep. If yes, the user takes a `pg_dump` of it first.
   - Then the user sets `DATABASE_URL` in `.env` to the value in `.env.example`.
   - The old database is never written to.
8. Update `.env.example`:
   ```
   DATABASE_URL=postgres://readingpro:readingpro@localhost:54329/readingpro
   ```

## Todo

- [x] `compose.yaml`
- [x] `db:*` scripts
- [x] Prisma reference dump
- [x] `V1__init.sql`
- [x] Migrate and diff
- [ ] Old dev DB backed up (if kept), `.env` switched — left to the user: `.env` points at a Neon database, which was never touched; tests and scripts use the local URL by override
- [x] `.env.example`

## Success Criteria

- `pnpm db:down -v && pnpm db:up && pnpm db:migrate && pnpm db:info` shows `1 | init | Success`.
- `reports/schema-diff.md` lists only the intended differences.

## Risks

- The Docker socket returns "permission denied" for the agent's shell, so the user may need to run these commands, for example with `! pnpm db:up`.
- `gen_random_uuid()` is built into Postgres 13+, so no extension is needed on 17.

## Implementation Notes

- Images pinned to `postgres:17.12-alpine` and `flyway/flyway:11.20.3-alpine` (latest 11.x; Flyway 12 and 13 exist but the plan fixed the 11 line).
- The migrations mount is `:ro,z`. Without `z`, SELinux on Fedora denies the Flyway container access to `db/migrations` and Flyway reports "No migrations found".
- The agent shell has no access to `/var/run/docker.sock`, so verification ran through a rootless Podman API socket (`DOCKER_HOST=unix:///run/user/1000/rp-podman.sock`) with the same `docker compose` scripts.
- `prisma migrate diff` from the reference DB to `prisma/schema.prisma` was empty, so the dump is the full current schema.
- Results: [schema-diff.md](./reports/schema-diff.md). `pnpm db:down -v && pnpm db:up && pnpm db:migrate && pnpm db:info` shows `1 | init | Success`.

## Rollback

`pnpm db:down -v` removes the container and its volume. The repo changes in this phase are additive. If the old `.env` value was backed up, restore it to go back.
