---
title: "Prisma Baseline, RLS, and Dictionary Source-of-Truth Reset"
description: "Rebuild Prisma migration history as the executable source of truth, centralize RLS under Prisma, and normalize dictionary seed layout without changing runtime behavior."
status: completed
priority: P2
branch: "fix/issue-46-api-boundary-contracts"
tags: [database, prisma, supabase, dictionary, rls, seed, migrations]
blockedBy: []
blocks:
  - 260604-1045-issue-46-legacy-input-runtime-fixes
  - 260604-1102-issue-46-output-boundary-migration
created: "2026-06-04T05:11:49.591Z"
createdBy: "ck:plan"
source: skill
---

# Prisma Baseline, RLS, and Dictionary Source-of-Truth Reset

## Overview

Make Prisma the single executable source of truth for database history and
dictionary seeding. This plan rewrites the migration history from a clean
baseline, moves RLS into a canonical Prisma-owned SQL file and migration,
normalizes the production dictionary seed into split files, and removes the
Supabase-side migration path so the repo stops carrying two competing database
sources of truth.

The refactor intentionally preserves current runtime behavior, Prisma models,
API contracts, and dictionary semantics. The only permitted changes are the
database history layout, RLS SQL ownership, seed file layout, helper script
placement, and the docs/config needed to keep those pieces coherent.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Migration Baseline Rewrite](./phase-01-migration-baseline-rewrite.md) | Completed |
| 2 | [Canonical RLS Migration](./phase-02-canonical-rls-migration.md) | Completed |
| 3 | [Dictionary Seed Normalization](./phase-03-dictionary-seed-normalization.md) | Completed |
| 4 | [Supabase Config and Docs Cleanup](./phase-04-supabase-config-and-docs-cleanup.md) | Completed |
| 5 | [Verification Gates](./phase-05-verification-gates.md) | Completed |

## Dependencies

- Blocks `260604-1045-issue-46-legacy-input-runtime-fixes`
- Blocks `260604-1102-issue-46-output-boundary-migration`
