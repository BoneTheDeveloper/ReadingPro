---
date: 2026-06-03
topic: dictionary raw sql grouping brainstorm
type: journal
---

# Dictionary Raw SQL Grouping Brainstorm

## Context

Reviewed `docs/API/Routes/dictionary-flow.md`,
`test-results/performance/dictionary-flow.md`, and current dictionary
repositories/services.

## What Happened

Agreed first optimization scope: group dictionary read work into raw SQL queries
while preserving current API input/output contracts. Index tuning and deeper SQL
optimization are deferred to a separate future plan.

## Decisions

- Use raw SQL for suggest, lookup, and entry detail repository reads.
- Keep search unchanged for this round because it already uses one raw SQL query.
- Tighten dictionary performance query budgets toward one query per non-short
  runtime read path.
- Prioritize DTO parity and route behavior over SQL cleverness.

## Next

Use brainstorm report
`plans/reports/260603-1716-dictionary-raw-sql-query-grouping.md` as context for
the implementation plan.
