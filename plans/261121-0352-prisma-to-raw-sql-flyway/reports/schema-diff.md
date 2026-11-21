# Schema diff: Prisma reference vs Flyway V1

Date: 2026-11-21. Both schemas were dumped with
`pg_dump --schema-only --no-owner --no-privileges` from Postgres 17.12 in the
compose container. The Prisma reference came from `prisma migrate deploy` of all
four Prisma migrations into a scratch `prisma_ref` database (dropped afterwards).
`prisma migrate diff` from that database to `prisma/schema.prisma` was empty,
so the migrations and the schema file did not drift.

- Reference: [prisma-reference-schema.sql](./prisma-reference-schema.sql)
- V1: [flyway-v1-schema.sql](./flyway-v1-schema.sql) (excludes `flyway_schema_history`)

## Differences (all intended)

| Difference | Where | Count |
|---|---|---|
| `timestamp(3) without time zone` became `timestamp(3) with time zone` | every timestamp column | 26 columns |
| `ProcessingStatus` labels `pending/completed/failed` became `PENDING/COMPLETED/FAILED` | enum and the `Passage.status` / `StudioArtifact.status` defaults | 1 enum, 2 defaults |
| `updatedAt` gained `DEFAULT CURRENT_TIMESTAMP` | `User`, `account`, `session`, `verification`, `UserProfile`, `VocabularyItem` | 6 columns |
| `_prisma_migrations` and its primary key are gone | n/a | 1 table |

Everything else is identical: tables, column order, nullability, defaults, enum
labels, primary keys, every index and constraint name, and every foreign key
action (including the `NO ACTION` on `VocabularyItem_vocabularySetId_fkey`).
