# Query Budget Benchmarks

This document tracks route-level Prisma query-count budgets enforced by the API
performance benchmark suite. Benchmark code remains the source of truth; update
this document when changing `QUERY_BUDGETS` or adding route coverage.

Run all route query-budget benchmarks with:

```bash
pnpm test:performance
```

Gate meanings:

- `hard fail`: query-budget failure exits non-zero.
- `soft warn`: query-budget failure is reported but does not fail the process.

## Covered Route Budgets

### Translation API

Source: `tests/performance/translate-flow-benchmark.ts`

Report artifacts:

- `test-results/performance/translate-flow.json`
- `test-results/performance/translate-flow.md`

| Route | Scenario | Budget | Gate |
|-------|----------|--------|------|
| `POST /api/translate` | `single-word-dictionary` | `<=4` queries | hard fail |
| `POST /api/translate` | `phrase-dictionary` | `<=4` queries | soft warn |
| `POST /api/translate` | `fallback` | `<=5` queries | soft warn |
| `POST /api/translate` | `cache-repeat` | `<=2` queries | soft warn |

Notes:

- A warm-up request runs before measured translate scenarios.
- Client memory cache hits should not call `POST /api/translate`; they are not
  counted by the server benchmark.

### Dictionary API

Source: `tests/performance/dictionary-flow-benchmark.ts`

Report artifacts:

- `test-results/performance/dictionary-flow.json`
- `test-results/performance/dictionary-flow.md`

| Route | Scenario | Budget | Gate |
|-------|----------|--------|------|
| `GET /api/dictionary/suggest` | `suggest-short-query` | `0` queries | hard fail |
| `GET /api/dictionary/suggest` | `suggest-headword-prefix` | `<=1` query | hard fail |
| `GET /api/dictionary/suggest` | `suggest-alias-prefix` | `<=1` query | hard fail |
| `GET /api/dictionary/search` | `search-exact-headword` | `<=6` queries | hard fail |
| `GET /api/dictionary/lookup` | `lookup-exact-headword` | `<=1` query | hard fail |
| `GET /api/dictionary/lookup` | `lookup-exact-alias` | `<=1` query | hard fail |
| `GET /api/dictionary/lookup` | `lookup-miss` | `<=1` query | hard fail |
| `GET /api/dictionary/entries/:entryId` | `entry-detail-by-id` | `<=1` query | hard fail |

Notes:

- Suggest, lookup, and entry-detail use grouped raw SQL queries that combine
  multiple Prisma reads into a single database round-trip.
- Search still has a looser `<=6` query budget until a future optimization pass.
- DB index tuning (`pg_trgm`, full-text search, materialized views) is deferred
  to a separate plan.

## Route Coverage Gaps

These documented API routes do not currently have query-budget benchmark
scenarios. Add a benchmark scenario and move the route into the covered budget
tables when query-count behavior becomes important for the route.

| Route | Current budget status |
|-------|-----------------------|
| `POST /api/vocabulary` | not benchmarked |
| `POST /api/study-chat` | not benchmarked |
| `POST /api/study-session` | not benchmarked |
| `PATCH /api/study-session` | not benchmarked |
| `GET /api/cards/due` | not benchmarked |
| `POST /api/cards/review` | not benchmarked |
| `GET /api/progress/stats` | not benchmarked |
| `POST /api/upload` | not benchmarked |
| `POST /api/upload/text` | not benchmarked |
