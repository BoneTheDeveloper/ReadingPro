---
phase: 3
title: "Lookup Query Grouping"
status: pending
priority: P1
effort: "3h"
dependencies: [1, 2]
---

# Phase 3: Lookup Query Grouping

## Overview

Replace sequential headword then alias lookup with one raw SQL lookup query,
returning the existing `DictionaryEntryDto | DictionaryMissDto` result.

## Requirements

- Functional: exact headword wins over alias when both could match.
- Functional: alias hit returns the canonical entry DTO.
- Functional: miss returns normalized miss object.
- Functional: `includeDraft` remains supported if still used by internal tests
  or callers.
- Non-functional: one Prisma-counted DB query for headword, alias, and miss
  lookup benchmark scenarios.

## Architecture

Prefer a single raw SQL function, for example `findDictionaryLookupEntry`, that
returns rows or a JSON-aggregated entry. Choose the simpler implementation that
keeps DTO parity:

- Option 1: flat rows grouped in TypeScript.
- Option 2: SQL JSON aggregation.

Default recommendation: flat rows grouped in TypeScript unless JSON aggregation
is clearly simpler. It is easier to test and less likely to break ordering or
empty-array semantics.

## Related Code Files

- Modify:
  `src/lib/dictionary/dictionary-lookup-repository.ts`
- Modify:
  `src/lib/dictionary/dictionary-lookup-service.ts`
- Modify:
  `src/lib/dictionary/dictionary-entry-dto-builder.ts`
- Preserve:
  `src/lib/dictionary/resolve-quick-dictionary-translation.ts`
- Modify/Create:
  `src/lib/dictionary/dictionary-lookup-service*.test.ts`

## Implementation Steps

### Tests Before

1. Add lookup mapper tests for:
   - exact headword hit
   - exact alias hit
   - headword precedence over alias
   - miss
   - draft inclusion only when `includeDraft` is true
   - reviewed/approved default runtime filtering
2. Add a test asserting one repository function call per lookup resolution.

### Refactor

1. Add a raw SQL lookup repository function using one query:
   - CTE candidates for exact headword and exact alias
   - rank headword `0`, alias `1`
   - select one winning entry
   - join senses and translations for requested target language/statuses
2. Convert returned rows to `DictionaryEntryDto` using shared mapper logic.
3. Return `{ headword: normalized, found: false }` when no rows are returned.
4. Keep `findQuickLookupTranslation` unchanged unless type sharing is needed.
5. Remove or stop using `findEntryByHeadword` and `findEntryByAlias` in runtime
   lookup after tests pass.

### Tests After

1. Run lookup service tests.
2. Run lookup route integration test.
3. Run quick lookup tests to ensure `/api/translate` shared dictionary behavior
   did not regress.

Regression gate:

```bash
pnpm exec vitest src/lib/dictionary/dictionary-lookup-service*.test.ts src/lib/dictionary/resolve-quick-dictionary-translation.test.ts tests/vitest/integration/api/dictionary-lookup-route.test.ts
```

## Success Criteria

- [ ] Lookup headword, alias, and miss paths issue one DB query each.
- [ ] `DictionaryEntryDto` shape unchanged.
- [ ] Runtime statuses still default to reviewed/approved.
- [ ] `includeDraft` behavior explicitly preserved or intentionally removed only
  after confirming no caller uses it.

## Risk Assessment

- Risk: lookup miss still performs a second fallback query. Mitigation: delete
  sequential repository calls from service path.
- Risk: quick translation regression through shared repository file. Mitigation:
  run quick lookup and translation tests.
