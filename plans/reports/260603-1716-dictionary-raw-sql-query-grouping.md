---
type: brainstorm-report
date: 2026-06-03
topic: dictionary raw sql query grouping
status: agreed
---

# Dictionary Raw SQL Query Grouping

## Summary

Refactor dictionary runtime reads to use grouped raw SQL queries first. Goal:
same API inputs and outputs, fewer DB round trips. SQL/index optimization is a
separate follow-up plan.

## Problem

Current dictionary performance report passes existing budgets, but several
routes still fan out through Prisma relation includes:

| Scenario | Current queries | Median |
| --- | ---: | ---: |
| suggest-headword-prefix | 8 | 409.72ms |
| suggest-alias-prefix | 8 | 412.34ms |
| lookup-exact-headword | 3 | 314.04ms |
| lookup-exact-alias | 5 | 511.13ms |
| lookup-miss | 5 | 520.21ms |
| entry-detail-by-id | 3 | 368.89ms |

Search already uses one raw SQL query and is faster:

| Scenario | Current queries | Median |
| --- | ---: | ---: |
| search-exact-headword | 1 | 125.63ms |

Conclusion: primary issue is split DB access. First fix should group data
loading into one query per route path.

## Requirements

Expected output:

- Implementation plan for converting suggest, lookup, and entry detail
  repository reads to raw SQL grouped queries.
- Existing API request and response contracts stay unchanged.
- Benchmark query budgets tighten to reflect one-query route reads.

Acceptance criteria:

- `GET /api/dictionary/suggest` accepts same params and returns same
  `DictionarySuggestItemDto[]` shape.
- `GET /api/dictionary/lookup` accepts same params and returns same
  `DictionaryEntryDto | DictionaryMissDto` shape.
- `GET /api/dictionary/entries/:entryId` accepts same params and returns same
  `DictionaryEntryDto` or `404` behavior.
- Existing route integration tests still pass.
- Dictionary performance benchmark passes with grouped query budgets.

Out of scope:

- Adding or changing DB indexes.
- `pg_trgm`, full-text search, materialized views, denormalized read tables.
- Redis, server memory cache, localStorage, IndexedDB, persistent browser cache.
- Changing public DTO fields, endpoint paths, auth behavior, or runtime
  approved/reviewed translation boundary.
- Quick translation behavior except preserving shared dictionary table rules.

Non-negotiable constraints:

- Keep Next.js route handlers as HTTP boundary.
- Keep route/service/repository split from `docs/API/Api-conventions.md`.
- Raw SQL is allowed inside dictionary repositories.
- Avoid logging raw query text.
- Runtime results only include approved/reviewed translations unless existing
  service option explicitly allows draft data.

Touchpoints:

- `src/lib/dictionary/dictionary-suggest-repository.ts`
- `src/lib/dictionary/dictionary-suggest-service.ts`
- `src/lib/dictionary/dictionary-lookup-repository.ts`
- `src/lib/dictionary/dictionary-lookup-service.ts`
- `src/lib/dictionary/dictionary-entry-detail-repository.ts`
- `src/lib/dictionary/dictionary-entry-detail-service.ts`
- `src/lib/dictionary/dictionary-entry-dto-builder.ts`
- `tests/performance/dictionary-flow-benchmark.ts`
- `docs/API/Routes/dictionary-flow.md`

## Evaluated Approaches

### Approach A: Prisma includes plus minor cleanup

Pros:

- Small code diff.
- Keeps Prisma type comfort.

Cons:

- Does not remove split relation queries.
- Query counts remain too high for the thinnest-query target.
- Does not follow the proven faster search path.

Verdict: reject.

### Approach B: Grouped raw SQL per repository

Pros:

- One DB round trip per runtime read path.
- Matches current successful search repository pattern.
- Keeps service and route contracts stable.
- Lets benchmark enforce real query-count improvement.

Cons:

- More SQL complexity.
- More manual DTO row parsing.
- Requires careful tests for JSON aggregation ordering and miss behavior.

Verdict: choose.

### Approach C: Denormalized read table or materialized view

Pros:

- Can be fastest long-term.
- Simplifies runtime reads after data is precomputed.

Cons:

- Bigger data pipeline change.
- Adds invalidation/rebuild concerns.
- Overkill before grouped raw SQL is measured.

Verdict: defer.

## Agreed Design

### Suggest

Replace two Prisma include queries with one raw SQL candidate query.

Input:

- `normalizedQuery`
- `sourceLanguage`
- `targetLanguage`
- `limit`

Output row:

- `id`
- `headword`
- `matchType`
- `matchedAlias`
- `primaryTranslation`
- `sourceType`
- `sourceName`

Query behavior:

- Headword prefix candidates.
- Alias prefix candidates.
- Rank exact headword, exact alias, then prefix.
- Dedupe by entry id, headword wins.
- Use lateral join for first approved primary translation.
- Keep result bounded.

### Lookup

Replace sequential headword then alias Prisma lookup with one raw SQL query.

Input:

- `normalizedQuery`
- `sourceLanguage`
- `targetLanguage`
- `statuses`

Output:

- A raw row/object convertible to existing `DictionaryEntryDto`, or no row for
  stable miss.

Query behavior:

- Exact headword and exact alias candidates in one query.
- Headword rank wins over alias.
- Return entry fields plus ordered senses and translations.
- Use SQL JSON aggregation or flat rows grouped in TypeScript. Prefer the
  simpler version that preserves output exactly with lowest implementation risk.

### Entry Detail

Replace Prisma include by id with one raw SQL query.

Input:

- `entryId`
- `sourceLanguage`
- `targetLanguage`
- `statuses`

Output:

- A raw row/object convertible to existing `DictionaryEntryDto`, or `null`.

Query behavior:

- Filter by id and source language.
- Include only runtime translation statuses.
- Preserve sense `usageRank` ordering.
- Preserve translation `rank` ordering.
- Return `null` when entry not found or source language mismatch.

### Search

Keep current raw SQL search query for this round.

Allowed changes:

- Only adapt shared DTO helpers if needed.
- No search ranking/index tuning in this plan.

## Proposed Query Budgets

| Scenario | Current budget | Proposed budget |
| --- | ---: | ---: |
| suggest-short-query | 0 | 0 |
| suggest-headword-prefix | 12 | 1 |
| suggest-alias-prefix | 12 | 1 |
| search-exact-headword | 6 | 1 |
| lookup-exact-headword | 6 | 1 |
| lookup-exact-alias | 8 | 1 |
| lookup-miss | 6 | 1 |
| entry-detail-by-id | 4 | 1 |

Latency budgets stay soft. Use production-mode benchmarks before claiming SLA.

## Risks

- SQL JSON aggregation can subtly change ordering or omit empty arrays.
- Exact DTO parity is more important than clever SQL.
- `includeDraft` behavior in lookup must not regress if still used by tests or
  internal callers.
- Query-count metrics may count fixture or auth work differently if benchmark
  instrumentation changes. Keep route metric step names stable.

## Validation

- Unit tests for SQL row-to-DTO conversion.
- Existing route integration tests for suggest/search/lookup/entry detail.
- Existing dictionary service tests.
- `pnpm test:performance -- --suite=dictionary`.
- Compare `test-results/performance/dictionary-flow.md` before/after.

## Next Steps

Create implementation plan for raw SQL query grouping only. Create a separate
future plan for DB indexes and SQL-level tuning after grouped queries are
measured.
