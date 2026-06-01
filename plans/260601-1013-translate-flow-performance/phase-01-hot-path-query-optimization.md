---
phase: 1
title: "Hot Path Query Optimization"
status: pending
priority: P1
effort: "6h"
dependencies: []
---

# Phase 1: Hot Path Query Optimization

## Overview

Collapse single-word dictionary lookup from 3 sequential Prisma queries to 1-2. This is the highest-leverage cut: `dictionaryResolve` accounts for 331ms of 778ms (43%).

## Requirements

- Functional: Preserve lookup order — exact headword, then exact alias, then deterministic miss/fallback.
- Functional: Quick translate only needs first usage-ranked primary runtime translation; not all translations or senses.
- Functional: `/api/dictionary` full DTO path must be unaffected.
- Non-functional: Single-word dictionary hit uses at most 1-2 Prisma queries for `dictionaryResolve`.
- Non-functional: Fallback/miss path optimization is deferred.

## Architecture

Introduce a lean DB helper for quick translation, separate from full dictionary DTO lookup:

```
resolveQuickDictionaryLookupSql(term, options)
  -> single $queryRaw with LEFT JOINs on DictionaryEntry + DictionaryAlias
  -> ordered by exact-before-alias, lowest usageRank, lowest rank
  -> select only entry id, first sense, first primary runtime translation
  -> return DictionaryTranslationDto | null
```

Current: `resolveQuickDictionaryLookup()` calls `findEntryByHeadword()` (1q) then `findEntryByAlias()` (1-2q) = 3q sequential.

Preferred: one SQL query for quick translate. App already depends on PostgreSQL.

| Step | Before | After this phase | Cut |
|------|--------|-------------------|-----|
| `sourceFetch` | 1q | 1q (unchanged) | — |
| `cacheRead` | 1q | 1q (unchanged) | — |
| `dictionaryResolve` | **3q** | **1-2q** | **−1 to −2** |
| `cacheWrite` | 1q | 1q (unchanged) | — |
| `historyCreate` | 1q | 1q (unchanged) | — |
| **Total** | **7q** | **5-6q** | **−1 to −2** |

## Code Location Map

| Function | File | Line | Shared? |
|----------|------|------|---------|
| `resolveQuickDictionaryTranslation()` | `src/lib/dictionary/resolve-quick-dictionary-translation.ts` | :20 | No |
| `resolveQuickDictionaryLookup()` | `src/lib/dictionary/resolve-dictionary-lookup.ts` | :40 | No (but calls shared functions) |
| `findEntryByHeadword()` | `src/lib/dictionary/resolve-dictionary-lookup.ts` | :68 | **Shared** — `/api/dictionary` |
| `findEntryByAlias()` | `src/lib/dictionary/resolve-dictionary-lookup.ts` | :85 | **Shared** — `/api/dictionary` |

**Do NOT modify** `findEntryByHeadword()` or `findEntryByAlias()`. Add new lean helper alongside.

## Related Code Files

- Modify: `src/lib/dictionary/resolve-dictionary-lookup.ts` — add new lean SQL helper
- Modify: `src/lib/dictionary/resolve-quick-dictionary-translation.ts` — wire new helper
- Read only: `src/lib/db/dictionary-queries.ts`
- Modify tests: `src/lib/dictionary/resolve-quick-dictionary-translation.test.ts`
- Verify: `tests/vitest/integration/api/translation-vocabulary-routes.test.ts`

## Implementation Steps

1. Add `resolveQuickDictionaryLookupSql()` in `resolve-dictionary-lookup.ts` using single `$queryRaw` with LEFT JOINs on `DictionaryEntry` + `DictionaryAlias`, ordered by exact-before-alias, lowest `usageRank`, lowest `rank`.
2. Select only primary runtime translations with statuses `reviewed` or `approved`.
3. Wire it in `resolve-quick-dictionary-translation.ts:25` — replace `resolveQuickDictionaryLookup()` call with new helper.
4. Leave `findEntryByHeadword()` and `findEntryByAlias()` untouched for `/api/dictionary`.
5. Add tests: exact hit, alias hit, phrase hit, draft/deprecated exclusion, miss/fallback.
6. Run `pnpm test:performance` to verify query count drops.

## Success Criteria

- [ ] Single-word `dictionaryResolve` uses at most 1-2 Prisma queries (down from 3).
- [ ] Exact-before-alias behavior preserved for single-word hits.
- [ ] Deterministic fallback text on miss preserved.
- [ ] Performance report shows 5-6 total queries (down from 7).

## Risk Assessment

Risk: Raw SQL can drift from Prisma schema names.
Mitigation: Keep raw SQL in one small helper, type output explicitly, cover with query-level tests. App is PostgreSQL-only so raw SQL is acceptable.

<!-- Updated: Validation Session 1 - confirmed $queryRaw approach -->
