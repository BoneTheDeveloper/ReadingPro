---
phase: 4
title: "Entry Detail Query Grouping"
status: pending
priority: P1
effort: "2h"
dependencies: [1, 3]
---

# Phase 4: Entry Detail Query Grouping

## Overview

Replace entry-detail Prisma include with one raw SQL query by `entryId`,
preserving current found, not-found, and source-language mismatch behavior.

## Requirements

- Functional: valid entry id returns `DictionaryEntryDto`.
- Functional: missing id or source-language mismatch returns `null` so route
  keeps `404`.
- Functional: only requested target language and runtime statuses are returned.
- Non-functional: one Prisma-counted DB query for entry detail benchmark.

## Architecture

Add a raw SQL entry-detail repository function that filters the entry by id and
source language before joining senses/translations. Reuse the row-to-entry DTO
mapper from lookup if possible. Do not create a general abstraction unless it
removes real duplication between lookup and entry detail.

## Related Code Files

- Modify:
  `src/lib/dictionary/dictionary-entry-detail-repository.ts`
- Modify:
  `src/lib/dictionary/dictionary-entry-detail-service.ts`
- Modify:
  `src/lib/dictionary/dictionary-entry-dto-builder.ts`
- Modify/Create:
  `src/lib/dictionary/dictionary-entry-detail-service.test.ts`
- Read:
  `src/app/api/dictionary/entries/[entryId]/route.ts`

## Implementation Steps

### Tests Before

1. Add entry-detail service/mapper tests for:
   - valid entry with multiple senses ordered by `usageRank`
   - translations ordered by `rank`
   - entry with no runtime translations filtered to empty/no usable senses
   - missing entry returns `null`
   - source-language mismatch returns `null`

### Refactor

1. Replace `db.dictionaryEntry.findUnique({ include: ... })` with one
   `$queryRaw` call.
2. Filter `entryId`, `sourceLanguage`, `targetLanguage`, and runtime statuses in
   SQL.
3. Reuse lookup row grouping if it is already clean and small.
4. Keep route validation/auth unchanged.
5. Keep Sentry span and performance step names stable enough for reports.

### Tests After

1. Run entry-detail service tests.
2. Run entry-detail route integration test.

Regression gate:

```bash
pnpm exec vitest src/lib/dictionary/dictionary-entry-detail-service.test.ts tests/vitest/integration/api/dictionary-entry-detail-route.test.ts
```

## Success Criteria

- [ ] Entry detail uses one raw SQL DB query.
- [ ] `404` behavior remains route-level behavior for `null` service result.
- [ ] DTO order and status filtering match current behavior.
- [ ] No index/schema migration added.

## Risk Assessment

- Risk: source-language mismatch is checked after loading too much data.
  Mitigation: include source-language in SQL filter.
- Risk: shared mapper becomes too broad. Mitigation: keep helper scoped to
  dictionary entry DTO construction only.
