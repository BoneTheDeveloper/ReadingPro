# Phase 3: Rewrite Search Route to Compact Results

## Context Links

- Spec: `docs/API/dictionary-flow.md` lines 172-244 (search endpoint), lines 437-445 (search server logic)
- Current search route: `src/app/api/dictionary/search/route.ts`
- Suggest route (reference pattern): `src/app/api/dictionary/suggest/route.ts`
- Existing queries: `src/lib/db/dictionary-queries.ts`
- Resolve lookup: `src/lib/dictionary/resolve-dictionary-lookup.ts`
- DTOs: `src/lib/dictionary/dictionary-dtos.ts`
- Normalizer: `src/lib/dictionary/normalize-dictionary-term.ts`

## Overview

- Priority: P1
- Status: Pending
- Rewrite `/api/dictionary/search` to return `DictionarySearchResultDto[]` instead of `DictionaryEntryDto | DictionaryMissDto`
- Extract search logic into a resolver module following the pattern of `resolve-dictionary-lookup.ts`

## Key Insights

1. Current search route (`search/route.ts:84-103`) delegates to `resolveDictionaryLookup` which does exact headword/alias only -- spec requires 5 match types: exact headword, exact alias, phrase, prefix, contains
2. Suggest route already demonstrates the merge/dedupe/rank pattern with headword prefix + alias prefix -- search extends this with more match types
3. The `resolveDictionaryLookup` function remains untouched (used by lookup route)
4. Performance tracker pattern is well-established in suggest route (lines 116-279)

## Requirements

### Functional
Per spec lines 437-445:
1. Authenticate user
2. Validate query params (q: 1-200 chars, sourceLanguage: "en", targetLanguage: "vi")
3. Normalize query
4. Return `{ success: true, data: [] }` for normalized query length < 2
5. Query exact headword and exact alias candidates
6. Query phrase, prefix, and contains candidates
7. Build compact result DTOs with primaryTranslation and backend-generated sourceLabel
8. Merge, dedupe by entry id, apply deterministic ranking, return bounded results

### Match Type Logic
- **exact**: `normalizedHeadword === normalizedQuery`
- **alias**: alias match where `normalizedAlias === normalizedQuery`
- **phrase**: entry headword contains the query as a word boundary match (or alias contains as word boundary)
- **prefix**: `normalizedHeadword.startsWith(normalizedQuery)` (or alias starts with)
- **contains**: `normalizedHeadword` contains normalizedQuery (or alias contains) -- broadest fallback

### Non-functional
- <=6 Prisma queries per spec budget (line 514)
- Deterministic ranking: exact > alias > phrase > prefix > contains
- Server-side limit bounding (default from spec)

## Architecture

Two files: resolver module for logic, route handler for HTTP concerns.

```
src/lib/dictionary/dictionary-search-resolver.ts  -- NEW: search query logic + DTO building
src/app/api/dictionary/search/route.ts            -- REWRITE: HTTP handler calling resolver
```

### Data Flow

```
search/route.ts
  -> validate params
  -> normalize query
  -> if len < 2: return []
  -> authenticate user
  -> call resolveDictionarySearch()
     -> findExactHeadword()         -- 1 query
     -> findExactAlias()            -- 1 query (only if no exact headword? No: spec says query BOTH)
     -> findPrefixMatches()         -- 1 query (headword prefix)
     -> findAliasPrefixMatches()    -- 1 query (alias prefix)
     -> findContainsMatches()       -- 1 query (headword contains, excluding already-found)
     -> build result DTOs
     -> merge, dedupe by id, rank
  -> return DictionarySearchResultDto[]
```

### Query Strategy

5 targeted queries max:
1. `findEntryByHeadword(normalized, sourceLanguage)` -- exact headword (reuse existing from `dictionary-queries.ts:5-29`)
2. `findEntryByAliasTerm(normalized, sourceLanguage)` -- exact alias (reuse existing from `dictionary-queries.ts:31-60`)
3. `findEntriesByHeadwordPrefix(normalized, sourceLanguage, limit)` -- prefix headword (reuse existing from `dictionary-queries.ts:62-110`)
4. `findEntriesByAliasPrefix(normalized, sourceLanguage, limit)` -- prefix alias (reuse existing from `dictionary-queries.ts:112-154`)
5. New: `findEntriesContaining(normalized, sourceLanguage, limit, excludeIds)` -- contains match for headwords not caught by exact/prefix

Phrase matches are derived from the prefix/contains results -- entries where the headword is a multi-word phrase containing the query term. No separate query needed if we tag contains results that match at word boundaries as "phrase" during DTO building.

### DTO Building

For each candidate entry, extract:
- `id`: entry.id
- `headword`: entry.headword
- `matchType`: determined by how it was found
- `matchedText`: the alias text if alias match, null for headword matches
- `primaryTranslation`: first primary translation from top-ranked sense
- `partOfSpeech`: from top-ranked sense
- `sourceLabel`: derived from primary translation's sourceType/sourceName using `getSourceLabel()`

Existing queries already include `senses.translations` -- but search needs only top sense + top primary translation. The existing prefix queries already limit to `take: 1` on senses and translations. For exact queries, we need to add similar limiting or extract from the full result.

**Optimization**: For exact headword/alias queries, the existing `findEntryByHeadword`/`findEntryByAliasTerm` load full senses + translations. For search we only need the first sense + first primary translation. However, these queries are reused by lookup which needs the full payload. Options:
- (A) Accept the full load for exact matches (2 of 5 queries return more data than needed) -- simpler
- (B) Create lean search-specific query variants -- DRY violation

Choose **(A)**. The exact match queries return at most 1 entry each. The overhead is bounded.

### New Query: findEntriesContaining

Need a new query in `dictionary-queries.ts` (extend P2 scope or add here):

```ts
export async function findEntriesContaining(
  substring: string,
  sourceLanguage: string,
  limit: number = 8,
  excludeIds: string[] = [],
) {
  if (substring.length < 2) return [];
  return db.dictionaryEntry.findMany({
    where: {
      normalizedHeadword: { contains: substring },
      sourceLanguage,
      id: { notIn: excludeIds },
      senses: {
        some: {
          translations: {
            some: {
              targetLanguage: "vi",
              status: { in: [...RUNTIME_STATUSES] },
              isPrimary: true,
            },
          },
        },
      },
    },
    orderBy: [{ frequencyRank: "asc" }, { normalizedHeadword: "asc" }],
    take: limit,
    include: {
      senses: {
        orderBy: { usageRank: "asc" },
        take: 1,
        include: {
          translations: {
            where: {
              targetLanguage: "vi",
              status: { in: [...RUNTIME_STATUSES] },
              isPrimary: true,
            },
            orderBy: [{ rank: "asc" }],
            take: 1,
          },
        },
      },
    },
  });
}
```

This query counts as 1 Prisma query. Total: 5 queries, within <=6 budget.

## Related Code Files

### Modify
- `src/app/api/dictionary/search/route.ts` -- full rewrite
- `src/lib/db/dictionary-queries.ts` -- add `findEntriesContaining`

### Create
- `src/lib/dictionary/dictionary-search-resolver.ts` -- new search logic module

### Delete
- None

## Implementation Steps

1. Add `findEntriesContaining` to `src/lib/db/dictionary-queries.ts`

2. Create `src/lib/dictionary/dictionary-search-resolver.ts`:
   - Import `findEntryByHeadword`, `findEntryByAliasTerm`, `findEntriesByHeadwordPrefix`, `findEntriesByAliasPrefix`, `findEntriesContaining` from queries
   - Import `getSourceLabel` from dtos
   - Import `DictionarySearchResultDto` from dtos (added in P1)
   - Import `normalizeDictionaryTerm` from normalizer
   - Implement `resolveDictionarySearch(query, options)`:
     - Normalize query
     - Run all 5 query paths (exact headword, exact alias, prefix headword, prefix alias, contains)
     - Build result DTOs per candidate, tagging matchType
     - Merge into single array, dedupe by entry id (keep highest-rank matchType)
     - Sort by rank score: exact=0, alias=1, phrase=2, prefix=3, contains=4
     - Return bounded array

3. Rewrite `src/app/api/dictionary/search/route.ts`:
   - Remove `resolveDictionaryLookup` import
   - Remove `DictionaryEntryDto`, `DictionaryMissDto` imports
   - Import `DictionarySearchResultDto` from dtos
   - Import `resolveDictionarySearch` from new resolver
   - Keep existing auth/validation/error pattern (follow suggest route pattern)
   - Change phase to `"search"` (unchanged)
   - Change response type: `{ success: true, data: DictionarySearchResultDto[] }`
   - Empty result for normalized query length < 2 (before auth, matching suggest pattern)
   - Update logging: log result count instead of found/miss

4. Verify the short-query path: `normalizedQuery.length < 2` returns `{ success: true, data: [] }` **before** authentication (spec line 235: "Normalized query length <2 returns `{ success: true, data: [] }`"). Verify that suggest route also does this before auth -- yes, `suggest/route.ts:157-162` confirms this pattern.

## Todo List

- [ ] Add `findEntriesContaining` to `dictionary-queries.ts`
- [ ] Create `dictionary-search-resolver.ts` with `resolveDictionarySearch`
- [ ] Rewrite `search/route.ts` to use new resolver and return `DictionarySearchResultDto[]`
- [ ] Verify short-query returns empty before auth
- [ ] Verify TypeScript compilation passes

## Success Criteria

- `GET /api/dictionary/search?q=test&sourceLanguage=en&targetLanguage=vi` returns `{ success: true, data: DictionarySearchResultDto[] }`
- Results contain only `id`, `headword`, `matchType`, `matchedText`, `primaryTranslation`, `partOfSpeech`, `sourceLabel`
- No full entry detail in response
- Ranking is deterministic: exact > alias > phrase > prefix > contains
- Results deduped by entry id
- Performance budget: <=6 queries

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `contains` query returns too many rows | Medium | Medium | `excludeIds` filters out already-found entries; `limit` bounds result set |
| Phrase detection logic ambiguous | Medium | Low | Word-boundary check: `\bquery\b` test on headword; if ambiguous, default to "contains" |
| Existing search integration test breaks | High | Medium | Test update in P6 |

## Security Considerations

- Route requires authenticated user (same as current)
- Query input validated with zod (same schema)
- No raw query text in logs (length only, per spec line 483)

## Next Steps

- P5 will add the search scenario to the benchmark
- P6 will update the integration test
