---
phase: 1
title: "Migration Baseline Rewrite"
status: completed
priority: P1
effort: "3h"
dependencies: []
---

# Phase 1: Migration Baseline Rewrite

## Overview

Generate a fresh Prisma migration baseline from the current validated
`prisma/schema.prisma`, then replace the old incremental migration history with
a clean replayable baseline. This phase makes the Prisma migration directory the
authoritative history that all later steps build on.

The baseline must preserve the current schema semantics already present in the
workspace, including the native UUID migration work that is in flight, and it
must be generated from Prisma rather than hand-authored SQL.

## Requirements

- Functional: the migration history starts from a new clean baseline.
- Functional: the baseline SQL matches the current Prisma schema.
- Functional: `pgcrypto` support for `gen_random_uuid()` is present where
  needed.
- Non-functional: the old migration chain is removed instead of being layered
  on top.

## Architecture

Use Prisma's own diff generation to create the baseline SQL from empty schema
to the current datamodel. Treat the output as generated history, not a manual
rewrite. The resulting `prisma/migrations/` tree should contain the new
baseline plus the later canonical RLS migration only.

## Related Code Files

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<new-baseline>/migration.sql`
- Modify or delete: old `prisma/migrations/*`
- Review: `prisma/migrations/migration_lock.toml`

## Implementation Steps

1. Generate a fresh baseline migration from `prisma/schema.prisma` using
   Prisma's migration diff tooling.
2. Make sure the generated SQL includes the native UUID defaults and any
   extension setup required for `gen_random_uuid()`.
3. Remove the old incremental migration history so only the new baseline
   remains as the replayable starting point.
4. Verify the baseline can replay cleanly against a reset development database
   without schema drift.

## Success Criteria

- [ ] The migration directory contains one clean baseline history instead of
  the old incremental chain.
- [ ] The generated baseline matches the current Prisma schema.
- [ ] A development reset replays the new baseline without error.
- [ ] No hand-written migration logic is introduced in place of Prisma output.

## Risk Assessment

Rewriting migration history is intentionally destructive for any database that
still depends on the old `_prisma_migrations` chain. That tradeoff is accepted
for this refactor because the database is being reset and re-baselined.
