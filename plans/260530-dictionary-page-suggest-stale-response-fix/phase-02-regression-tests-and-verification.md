---
phase: 2
title: "Regression Tests and Verification"
status: pending
priority: P2
effort: "2h"
dependencies:
  - 1
---

# Phase 2: Regression Tests and Verification

## Overview

Add focused component coverage for stale dictionary suggestions and run verification for the touched files.

## Main Info

- Problem: Async race behavior is easy to regress if it is only manually tested.
- Resolve: Add a controlled-fetch component test that resolves requests out of order and verifies only the latest query is displayed.

## Requirements

- Functional: Test out-of-order suggest responses.
- Functional: Test clearing input while a request is in flight.
- Non-functional: Preserve existing dictionary page behavior and avoid broad unrelated test changes.

## Architecture

Use the repo's Vitest + Testing Library component patterns. If no dictionary component test exists, create a focused test file under `__tests__/components/dictionary/`.

## Related Code Files

- Create/Modify: `__tests__/components/dictionary/dictionary-page-client.integration.test.tsx`
- Read: `__tests__/components/study/study-page-client.integration.test.tsx` for fetch mock patterns
- Read: `docs/testing/vitest-infrastructure.md`

## Implementation Steps

1. Add a controlled promise helper for mocked suggest fetch calls.
2. Render `DictionaryPageClient` with message mocks.
3. Type query A, then query B before A resolves.
4. Resolve B first and assert B suggestions display.
5. Resolve A later and assert B suggestions remain.
6. Test clearing the input before a response resolves and assert suggestions/dropdown stay hidden.
7. Run focused test, then `pnpm run typecheck`, `pnpm run lint`, and relevant Vitest suite.

## Success Criteria

- [ ] Out-of-order response regression test passes.
- [ ] Cleared-input stale response regression test passes.
- [ ] `pnpm run typecheck` passes.
- [ ] `pnpm run lint` passes.
- [ ] Relevant Vitest tests pass.

## Risk Assessment

The most likely test risk is coupling to dropdown implementation details. Assert user-visible suggestion text and absence/presence rather than internal state.
