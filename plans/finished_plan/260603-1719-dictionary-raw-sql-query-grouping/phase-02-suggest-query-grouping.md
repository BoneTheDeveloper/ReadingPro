---
phase: 2
title: "Suggest Query Grouping"
status: pending
priority: P1
effort: "2.5h"
dependencies: [1]
---

# Phase 2: Suggest Query Grouping

## Overview

Replace suggest repository Prisma relation includes with one raw SQL candidate
query while preserving `DictionarySuggestItemDto[]`.

## Requirements

- Functional: `GET /api/dictionary/suggest` accepts same params and returns same
  DTO shape.
- Functional: normalized query length `<2` still returns `[]` with zero DB
  queries.
- Functional: ranking remains exact headword, exact alias, prefix.
- Non-functional: one Prisma-counted DB query for non-short suggest scenarios.

## Architecture

Current service calls two repository functions in parallel. Replace this with a
single repository function, for example `findSuggestCandidates`, returning
compact rows:

```ts
interface SuggestCandidateRow {
  id: string;
  headword: string;
  matchType: "exact" | "alias" | "prefix" | "phrase";
  matchedAlias: string | null;
  aliasType: string | null;
  primaryTranslation: string | null;
}
```

SQL shape:

- CTE for headword prefix candidates.
- CTE for alias prefix candidates.
- `UNION ALL`, rank, and `DISTINCT ON (id)` or `row_number()`.
- LATERAL join first approved primary translation.
- Preserve alias `sourceLabel` by returning `aliasType`; current service maps
  alias labels with `getSourceLabel(aliasType, null)`.
- Bound final results by `limit`.

## Related Code Files

- Modify:
  `src/lib/dictionary/dictionary-suggest-repository.ts`
- Modify:
  `src/lib/dictionary/dictionary-suggest-service.ts`
- Modify:
  `src/lib/dictionary/dictionary-dtos.ts`
- Read/Modify only if instrumentation step names must change:
  `src/lib/dictionary/dictionary-performance.ts`
- Modify/Create:
  `src/lib/dictionary/dictionary-suggest-service.test.ts`

## Implementation Steps

### Tests Before

1. Assert service passes normalized query, source language, target language, and
   bounded limit to the repository.
2. Assert row mapping creates exact same suggest DTO fields.
3. Assert alias row mapping preserves `aliasType` to `sourceLabel` behavior.
4. Assert dedupe/ranking with candidate rows representing duplicate headword and
   alias hits.

### Refactor

1. Add `DictionarySuggestCandidateRow` interface in the suggest repository.
2. Replace `findEntriesByHeadwordPrefix` and `findEntriesByAliasPrefix` runtime
   use with one raw SQL function.
3. Keep old function exports only if tests or callers still need them; otherwise
   delete after all references are gone.
4. Update service mapping to consume compact rows. Do not expose SQL row shape
   outside `src/lib/dictionary`.
5. Ensure Sentry span attributes avoid raw query text. Query length is enough.
6. Preserve existing route auth and short-query behavior.

### Tests After

1. Run suggest service tests.
2. Run suggest route integration test.
3. Run dictionary performance suite after later benchmark phase, not required
   as a blocking command here.

Regression gate:

```bash
pnpm exec vitest src/lib/dictionary/dictionary-suggest-service.test.ts tests/vitest/integration/api/dictionary-suggest-route.test.ts
```

## Success Criteria

- [ ] Non-short suggest uses one repository raw SQL call.
- [ ] Suggest DTO contract unchanged.
- [ ] Short suggest still performs zero DB queries.
- [ ] No DB index/schema migration added in this phase.

## Risk Assessment

- Risk: alias source label changes because current code uses `aliasType`, not
  translation `sourceType/sourceName`. Mitigation: include `aliasType` in the
  raw SQL candidate row and preserve current label mapping in tests.
- Risk: `DISTINCT ON` ordering is wrong. Mitigation: test duplicate entry ids
  with headword and alias candidates.
