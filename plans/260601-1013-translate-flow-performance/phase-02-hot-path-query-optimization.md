---
phase: 2
title: "Hot Path Query Optimization"
status: pending
priority: P1
effort: "6h"
dependencies: [1]
---

# Phase 2: Hot Path Query Optimization

## Overview

Collapse the single-word dictionary lookup path from 3 sequential Prisma queries to 1-2. This is the highest-leverage cut: `dictionaryResolve` accounts for 331ms of the 778ms single-word hit route time (43%).

## Requirements

- Functional: Preserve lookup order: exact headword, then exact alias, then deterministic miss/fallback.
- Functional: Quick translate only needs the first usage-ranked primary runtime translation; it should not load all translations or all senses.
- Functional: API dictionary lookup can still return full DTOs where needed, but `/api/translate` should use a lean quick-lookup query.
- Non-functional: **Single-word dictionary hit** should use at most 1-2 Prisma queries for `dictionaryResolve`.
- Non-functional: Fallback/miss path optimization is deferred — this phase focuses on the hit path only.

## Architecture

Introduce a lean DB helper for quick translation, separate from full dictionary DTO lookup:

```ts
resolveQuickDictionaryLookup(term, options)
  -> query exact headword and alias candidate in a grouped/bounded shape
  -> select only entry id, first sense, first primary runtime translation
  -> return DictionaryTranslationDto | null
```

The current `src/lib/dictionary/resolve-dictionary-lookup.ts` performs sequential `findUnique` then `findFirst`; benchmark shows 3 queries (331ms) for a single-word hit. The optimized helper should either:

- Use a single `$queryRaw` with left joins and priority ordering for exact-vs-alias match, or
- Use `db.$transaction([exactQuery, aliasQuery])` to parallelize two bounded queries if a portable Prisma-only approach is preferred.

Preferred implementation: one SQL query for quick translate, because the target is query count reduction and the app already depends on PostgreSQL.

Single-word hit query cut map (this phase targets `dictionaryResolve` row):

| Step | Before | After this phase | Cut |
|------|--------|-------------------|-----|
| `sourceFetch` | 1q | 1q (unchanged) | — |
| `cacheRead` | 1q | 1q (unchanged) | — |
| `dictionaryResolve` | **3q** | **1-2q** | **−1 to −2** |
| `cacheWrite` | 1q | 1q (unchanged) | — |
| `historyCreate` | 1q | 1q (unchanged) | — |
| **Total** | **7q** | **5-6q** | **−1 to −2** |

## Code Location Map

### This phase's target: `dictionaryResolve` (3 queries)

| Function | File | Line | Prisma op | Shared? |
|----------|------|------|-----------|---------|
| `resolveQuickDictionaryTranslation()` | `src/lib/dictionary/resolve-quick-dictionary-translation.ts` | :20 | orchestrator, no direct DB | Called only by `src/app/api/translate/route.ts:307` |
| `resolveQuickDictionaryLookup()` | `src/lib/dictionary/resolve-dictionary-lookup.ts` | :40 | calls headword + alias lookups | Called only by `resolve-quick-dictionary-translation.ts:25` |
| `findEntryByHeadword()` | `src/lib/dictionary/resolve-dictionary-lookup.ts` | :68 | `db.dictionaryEntry.findUnique` | **Shared** — also used by full `resolveDictionaryLookup()` at line 28 |
| `findEntryByAlias()` | `src/lib/dictionary/resolve-dictionary-lookup.ts` | :85 | `db.dictionaryAlias.findFirst` (1-2 queries) | **Shared** — also used by full `resolveDictionaryLookup()` at line 33 |

### Other flows that share dictionary internals

| Flow | Function | File | Line |
|------|----------|------|------|
| `/api/dictionary` (full DTO) | `resolveDictionaryLookup()` | `src/app/api/dictionary/route.ts` | :60 |

### Strategy: do NOT modify shared functions

Add a **new** lean helper (e.g. `resolveQuickDictionaryLookupSql()`) alongside the existing ones. Leave `findEntryByHeadword()` and `findEntryByAlias()` untouched so `/api/dictionary` full DTO path is unaffected.

## Related Code Files

- Modify: `src/lib/dictionary/resolve-quick-dictionary-translation.ts` — swap `resolveQuickDictionaryLookup` call to new lean helper
- Modify: `src/lib/dictionary/resolve-dictionary-lookup.ts` — add new lean SQL/transaction helper (do NOT modify `findEntryByHeadword`/`findEntryByAlias`)
- Read only: `src/lib/db/dictionary-queries.ts`
- Modify tests: `src/lib/dictionary/resolve-quick-dictionary-translation.test.ts`
- Verify: `__tests__/api/translation-vocabulary-routes.test.ts`

## Implementation Steps

1. Add a quick-translate-specific lookup helper that accepts normalized term, source language, and target language.
2. Select only primary runtime translations with statuses `reviewed` or `approved`.
3. Order candidates deterministically: exact headword before alias, lowest `usageRank`, lowest translation `rank`, stable ids.
4. Replace the translate route’s quick dictionary call path with the lean helper while keeping full `/api/dictionary` DTO behavior unchanged.
5. Add tests for exact hit, alias hit, phrase hit, draft/deprecated exclusion, and miss/fallback.
6. Re-run `pnpm test:performance` and compare `dictionaryResolve` query count against the Phase 1 baseline.

## Success Criteria

- [ ] Single-word dictionary hit `dictionaryResolve` uses at most 1-2 Prisma queries (down from 3).
- [ ] Quick translate preserves exact-before-alias behavior for single-word hits.
- [ ] Quick translate still returns deterministic fallback text on miss.
- [ ] Performance report shows single-word hit at 5-6 total queries (down from 7) after this phase.
- [ ] Fallback/miss path query count is not a blocker for this phase (deferred).

## Risk Assessment

Risk: Raw SQL can drift from Prisma schema names.
Mitigation: Keep raw SQL in one small helper, type its output explicitly, and cover it with query-level tests. If raw SQL is rejected, use a Prisma `$transaction` fallback and document why the query budget is less aggressive.
