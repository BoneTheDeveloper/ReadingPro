---
phase: 5
title: "Update use-study-actions and workspace-state tests for new state shape"
status: pending
priority: P1
effort: "1.5h"
dependencies: [3, 4]
---

# Phase 5: Update use-study-actions and workspace-state tests for new state shape

## Overview

Update existing tests for `use-study-actions` and `use-study-workspace-state` to match the new passage-scoped state shape. Verify cache fetch, race-safety, and optimistic update behavior.

## Requirements

- All existing test coverage maintained
- New tests for: cache fetch on passage switch, stale-time skip, optimistic generation, race-condition safety
- Tests must use real state shape (no mocks for state management)

## Related Code Files

- Modify: `src/features/study/use-study-actions.test.ts`
- Modify: `src/features/study/use-study-workspace-state.test.ts`
- Read: `src/features/study/study-types.ts` (new types)

## Implementation Steps

1. **use-study-workspace-state.test.ts**:
   - Update `createState()` helper to use new `StudyState` shape (`resultsByPassageId`, `viewingResultByPassageId`, `resultDetailById` instead of `viewingArtifactId`, `questions`, `generatingQuestions`)
   - Update "selects different active passage" test — verify `resultsByPassageId` is preserved, not cleared
   - Update "deletes active passage" test — verify cache cleanup
   - Update "upload complete" test — verify new state shape
   - Update "initial state" test — verify new fields

2. **use-study-actions.test.ts**:
   - Remove references to `artifacts` array in assertions
   - Quiz generation test: verify `resultsByPassageId[passageId].data` has the result, verify `resultDetailById` has questions
   - Summary generation test: verify cache entry has the result, verify detail has simplified content
   - Race-condition test: verify switching `activePassageId` mid-generation writes error to the original passage's cache, not the new passage
   - Error test: verify `status: "error"` in the correct passage cache
   - Optimistic test: verify "running" result appears immediately after `handleActionClick`, before generation completes

3. **Add cache fetch test** (new describe block in workspace-state or separate file):
   - Verify fetch triggered when `activePassageId` changes to a passage with no cache
   - Verify fetch skipped when cache is fresh (<60s)
   - Verify fetch triggered when cache is stale (>60s)
   - Verify abort on rapid passage switching

## Success Criteria

- [ ] All tests pass with `vitest run`
- [ ] No `StudioItem` or `viewingArtifactId` references in test files
- [ ] Race-condition scenario covered (switch passage during generation)
- [ ] Cache fetch scenarios covered (no cache, fresh, stale)
- [ ] Optimistic update scenario covered (running → completed)

## Risk Assessment

Low risk. Tests follow the same patterns as existing tests. The new cache-fetch tests may need `fetch` mocking (already used in `page-client.tsx` tests via vitest).
