---
phase: 2
title: "Dictionary Response Contracts"
status: completed
priority: P2
effort: "3h"
dependencies: [1]
---

# Phase 2: Dictionary Response Contracts

## Overview

Migrate the dictionary route family using its existing shared DTO concepts.
Cover lookup, search, suggest, and entry detail, including optional performance
diagnostics and the two current browser consumers.

## Requirements

- Functional: runtime schemas cover dictionary entry, miss, search result,
  suggestion, success envelopes, and errors.
- Functional: dictionary page validates suggestion and entry-detail responses.
- Non-functional: preserve existing ranking/service behavior and DTO labels.

## Architecture

Add runtime schemas under `src/lib/dictionary/shared/` and infer DTO types from
them. Preserve DTO builder/service boundaries; schemas define the wire contract,
not database row shapes.

## Related Code Files

- Create: `src/lib/dictionary/shared/dictionary-response-schema.ts`
- Modify: `src/lib/dictionary/shared/dictionary-dtos.ts`
- Modify: `src/features/dictionary/dictionary-page-client.tsx`
- Modify: `tests/vitest/integration/api/dictionary-lookup-route.test.ts`
- Modify: `tests/vitest/integration/api/dictionary-search-route.test.ts`
- Modify: `tests/vitest/integration/api/dictionary-suggest-route.test.ts`
- Modify: `tests/vitest/integration/api/dictionary-entry-detail-route.test.ts`

## Implementation Steps

1. Translate existing dictionary DTO interfaces/unions into runtime schemas
   without changing public field names.
2. Model standard and performance-enabled success envelopes.
3. Parse suggest and entry-detail frontend responses before updating state or
   cache.
4. Add frontend malformed-payload behavior tests.
5. Parse all dictionary route test responses with shared schemas and assert
   complete contracts.
6. Run dictionary service tests to ensure schema work does not leak into
   repository/domain behavior.

## Regression Gate

```bash
pnpm exec vitest run tests/vitest/integration/api/dictionary-lookup-route.test.ts tests/vitest/integration/api/dictionary-search-route.test.ts tests/vitest/integration/api/dictionary-suggest-route.test.ts tests/vitest/integration/api/dictionary-entry-detail-route.test.ts src/lib/dictionary
```

## Success Criteria

- [x] Existing dictionary DTO fields are represented by runtime schemas.
- [x] Suggest and entry-detail clients reject malformed success payloads.
- [x] All four dictionary routes have complete success/error contract tests.
- [x] Optional performance diagnostics are explicitly modeled.
- [x] No raw repository row becomes a public API contract accidentally.

## Risk Assessment

Converting interfaces to inferred types may surface nullability drift in
builders/services. Treat failures as contract evidence and reconcile the
DTO/schema at the API boundary without weakening DB types.

## Security Considerations

- Do not expose internal audit/source fields not already in stable DTOs.
- Preserve authentication and not-found behavior unchanged.
