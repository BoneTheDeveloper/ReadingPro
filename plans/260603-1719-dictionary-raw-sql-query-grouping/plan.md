---
title: "Dictionary Raw SQL Query Grouping"
description: "Group dictionary runtime reads into raw SQL queries while preserving current API contracts."
status: complete
priority: P2
effort: 11h
branch: "dictionary_search_flow_impliment"
tags: [refactor, api, database, performance]
blockedBy: []
blocks: []
created: "2026-06-03T10:19:09.794Z"
createdBy: "ck:plan"
source: skill
---

# Dictionary Raw SQL Query Grouping

## Overview

Convert dictionary suggest, lookup, and entry-detail repository reads from
Prisma relation includes to grouped raw SQL queries. Preserve existing endpoint
paths, request params, DTO shapes, auth behavior, logging privacy, and runtime
approved/reviewed translation boundary.

This plan intentionally excludes DB index tuning and deeper SQL optimization.
Those should use a separate plan after grouped-query performance is measured.

Source brainstorm:
`plans/reports/260603-1716-dictionary-raw-sql-query-grouping.md`

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Regression Contracts](./phase-01-regression-contracts.md) | Done |
| 2 | [Suggest Query Grouping](./phase-02-suggest-query-grouping.md) | Done |
| 3 | [Lookup Query Grouping](./phase-03-lookup-query-grouping.md) | Done |
| 4 | [Entry Detail Query Grouping](./phase-04-entry-detail-query-grouping.md) | Done |
| 5 | [Benchmark Docs Verification](./phase-05-benchmark-docs-verification.md) | Done |

## Dependencies

- No unfinished overlapping project plans detected during creation.
- Prior finished context:
  - `plans/finished_plan/260531-dictionary-mvp-feature/plan.md`
  - `plans/finished_plan/260603-1045-dictionary-routes-api-convention/plan.md`
  - `plans/finished_plan/260601-2141-nextjs-performance-testing-hardening/plan.md`

## Success Criteria

- `GET /api/dictionary/suggest` keeps same input/output contract and uses one
  Prisma-counted DB query for non-short benchmark scenarios.
- `GET /api/dictionary/lookup` keeps same input/output contract and uses one
  Prisma-counted DB query for headword, alias, and miss benchmark scenarios.
- `GET /api/dictionary/entries/:entryId` keeps same input/output contract and
  uses one Prisma-counted DB query for entry-detail benchmark scenario.
- `GET /api/dictionary/search` behavior stays unchanged except budget tightening.
- `pnpm run typecheck`, focused Vitest coverage, and
  `pnpm test:performance -- --suite=dictionary` pass.

## Out Of Scope

- Prisma schema/index changes.
- SQL index tuning, `pg_trgm`, full-text search, materialized views, read tables.
- Redis, server memory cache, persistent browser cache.
- Public DTO or endpoint path changes.
- Quick translation changes beyond avoiding regression to shared dictionary code.

## Validation Log

### Validation Session 1 - 2026-06-03

#### Verification Results

- **Tier:** Full
- **Claims checked:** 34
- **Verified:** 33
- **Failed:** 1
- **Unverified:** 0

Failures:

1. [Contract Verifier] Phase 2 suggest candidate row originally planned
   `sourceType/sourceName` for suggest source labels. Current implementation
   maps alias suggest labels from `aliasType` in
   `src/lib/dictionary/dictionary-suggest-service.ts`; plan updated to carry
   `aliasType` and test that mapping.

#### Decisions Confirmed

- Keep public dictionary API inputs and outputs unchanged.
- Keep first implementation round scoped to raw SQL query grouping only.
- Defer DB indexes and deeper SQL tuning to a later plan.
- Keep latency budgets soft; hard gate is query count.

#### Interview Questions

- Questions asked: 0
- Reason: validation found one contract mismatch with direct code evidence and
  the correction follows the already-agreed non-negotiable requirement to
  preserve current API output.

### Whole-Plan Consistency Sweep

- Files reread: `plan.md`, `phase-01-regression-contracts.md`,
  `phase-02-suggest-query-grouping.md`,
  `phase-03-lookup-query-grouping.md`,
  `phase-04-entry-detail-query-grouping.md`,
  `phase-05-benchmark-docs-verification.md`
- Decision deltas checked: 1
- Reconciled stale references: 2
- Unresolved contradictions: 0
