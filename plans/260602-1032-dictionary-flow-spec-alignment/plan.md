---
title: "Dictionary Flow Spec Alignment"
description: "Align search endpoint to compact result rows, add entry-detail endpoint, extend performance benchmarks"
status: pending
priority: P1
effort: 6h
branch: dictionary_search_flow_impliment
tags: [dictionary, api, spec-alignment, performance]
created: 2026-06-02
---

# Dictionary Flow Spec Alignment

## Problem

The `/api/dictionary/search` endpoint returns full `DictionaryEntryDto` (complete entry with senses/translations) instead of compact `DictionarySearchResult[]` rows per spec. The entry-detail endpoint (`/api/dictionary/entries/:entryId`) does not exist. The performance benchmark suite has 7 scenarios; spec requires 8 (missing entry-detail-by-id).

## Scope

6 files modified, 2 files created. No changes to suggest or lookup endpoints.

## Phases

| Phase | Summary | Files | Effort |
|-------|---------|-------|--------|
| [P1](phase-01-dto-and-performance-types.md) | Add DTO + extend performance types | `dictionary-dtos.ts`, `dictionary-performance.ts` | 45m |
| [P2](phase-02-dictionary-queries.md) | Add `findEntryById` query | `dictionary-queries.ts` | 30m |
| [P3](phase-03-search-route-rewrite.md) | Rewrite search to compact results | `search/route.ts`, new `dictionary-search-resolver.ts` | 2h |
| [P4](phase-04-entry-detail-endpoint.md) | Create entry-detail endpoint | new `entries/[entryId]/route.ts` | 45m |
| [P5](phase-05-benchmark-and-fixtures.md) | Add entry-detail benchmark scenario | `dictionary-flow-benchmark.ts`, `dictionary-performance-fixtures/route.ts` | 1h |
| [P6](phase-06-tests.md) | Fix existing test, add entry-detail tests | `dictionary-search-route.test.ts`, new `dictionary-entry-detail-route.test.ts` | 1h |

## Dependency Graph

```
P1 (DTO + perf types) ──┬──> P3 (search rewrite)
                        └──> P4 (entry detail)
P2 (findEntryById query) ──> P4 (entry detail)
P3 ────────────────────────> P5 (benchmark)
P4 ────────────────────────> P5 (benchmark)
P3 ────────────────────────> P6 (tests)
P4 ────────────────────────> P6 (tests)
```

P1 and P2 are parallelizable. P3 and P4 can start once P1 completes (P4 also needs P2).

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Search rewrite breaks existing consumers | Medium | High | No known frontend consumers of search yet (only suggest/lookup used in UI); integration test update in P6 |
| Entry-detail leaks draft translations | Low | High | Filter by RUNTIME_STATUSES in query (same pattern as lookup) |
| Search query explosion (5 query paths) | Medium | Medium | Spec budget is <=6 queries; verify in P5 benchmark |
| Prisma N+1 in search result building | Medium | Medium | Use targeted includes (top sense + top primary translation only) |

## Backwards Compatibility

- Search response shape **intentionally breaks** from `DictionaryEntryDto | DictionaryMissDto` to `DictionarySearchResult[]` -- this is the spec alignment goal
- Suggest and lookup endpoints untouched -- zero regression risk
- Existing `resolveDictionaryLookup` function stays as-is (used by lookup route)

## Success Criteria

1. `GET /api/dictionary/search?q=...&sourceLanguage=en&targetLanguage=vi` returns `{ success: true, data: DictionarySearchResult[] }`
2. `GET /api/dictionary/entries/:entryId?sourceLanguage=en&targetLanguage=vi` returns `{ success: true, data: DictionaryEntry }` or 404
3. Performance benchmark runs 8 scenarios including `entry-detail-by-id` with <=4 queries
4. Suggest and lookup endpoints pass all existing tests unchanged
5. All integration/unit tests pass

## Rollback

Each phase touches distinct files. Revert by file-level git checkout per phase. No shared state mutations across phases.
