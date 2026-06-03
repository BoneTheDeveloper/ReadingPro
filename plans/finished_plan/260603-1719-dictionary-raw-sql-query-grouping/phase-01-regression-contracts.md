---
phase: 1
title: "Regression Contracts"
status: pending
priority: P1
effort: "1.5h"
dependencies: []
---

# Phase 1: Regression Contracts

## Overview

Lock current dictionary API contracts and DTO conversion behavior before
changing repository query shapes.

Context:

- Brainstorm report:
  `plans/reports/260603-1716-dictionary-raw-sql-query-grouping.md`
- Route docs:
  `docs/API/Routes/dictionary-feature.md`
- Current performance report:
  `test-results/performance/dictionary-flow.md`

## Requirements

- Functional: current suggest, lookup, entry-detail route behavior remains
  observable in tests before SQL refactor.
- Functional: DTO row conversion tests cover ordered senses/translations,
  source labels, misses, alias preference, and source-language mismatch.
- Non-functional: tests must not require real DB network access.

## Architecture

Add focused unit tests around repository result mapping or service-level DTO
conversion. Route tests already mock services; keep those as HTTP boundary
contracts. Add lower-level tests for raw-query result handling so later phases
can replace Prisma includes without changing public DTO output.

## Related Code Files

- Modify:
  `src/lib/dictionary/dictionary-suggest-service.ts`
- Modify:
  `src/lib/dictionary/dictionary-lookup-service.ts`
- Modify:
  `src/lib/dictionary/dictionary-entry-detail-service.ts`
- Modify/Create:
  `src/lib/dictionary/*test.ts`
- Read:
  `tests/vitest/integration/api/dictionary-suggest-route.test.ts`
- Read:
  `tests/vitest/integration/api/dictionary-lookup-route.test.ts`
- Read:
  `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts`

## Implementation Steps

### Tests Before

1. Add or extend suggest service tests to assert:
   - short normalized query returns `[]` and does not query repository
   - exact headword ranks before alias and prefix
   - duplicate entry ids dedupe with headword result winning
   - `sourceLabel` remains current behavior: headword rows use `Dictionary`
     when a primary translation exists; alias rows derive the label from
     `aliasType`
2. Add lookup service or mapper tests to assert:
   - exact headword returns `DictionaryEntryDto`
   - exact alias returns same entry DTO
   - miss returns `{ headword: normalized, found: false }`
   - `includeDraft` still includes draft translations when explicitly passed
   - sense and translation order is preserved
3. Add entry-detail service or mapper tests to assert:
   - found entry returns `DictionaryEntryDto`
   - source-language mismatch returns `null`
   - senses with no runtime translations are filtered out
4. Run focused tests and record failing/passing baseline.

### Refactor

No production refactor in this phase except extracting pure mapper helpers if
needed to make tests possible. Keep helper extraction small and local to
`src/lib/dictionary`.

### Tests After

1. Run focused dictionary service tests.
2. Run existing dictionary route integration tests.

Regression gate:

```bash
pnpm exec vitest src/lib/dictionary tests/vitest/integration/api/dictionary-suggest-route.test.ts tests/vitest/integration/api/dictionary-lookup-route.test.ts tests/vitest/integration/api/dictionary-entry-detail-route.test.ts
```

## Success Criteria

- [ ] Contract tests fail on DTO/order/source-label regressions.
- [ ] Suggest alias tests cover `aliasType` to `sourceLabel` mapping.
- [ ] Existing route tests still pass.
- [ ] No API response field changes introduced.

## Risk Assessment

- Risk: tests overfit implementation internals. Mitigation: assert DTO behavior,
  not exact SQL text.
- Risk: helper extraction grows into refactor. Mitigation: only extract pure
  row-to-DTO mapping needed by later phases.
