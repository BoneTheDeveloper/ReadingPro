# ADR 0004: Use Prisma With Raw SQL For Dictionary

## Status

Accepted.

## Context

Most app data access benefits from Prisma's typed client. Dictionary lookup/search requires careful grouping, ranking, and query-budget performance.

## Decision

Use Prisma for the primary database client and migrations. Allow raw SQL in dictionary repositories when it materially improves correctness or performance.

## Consequences

- Raw SQL must stay inside repository modules.
- SQL must use Prisma tagged templates and parameterized values.
- Dictionary route performance can be benchmarked with query metrics.
- DTO builders isolate SQL rows from public API response shapes.

## Alternatives Considered

- Prisma-only dictionary queries: simpler, but can increase query count and grouping complexity.
- Full search engine: more capability than the MVP needs.
