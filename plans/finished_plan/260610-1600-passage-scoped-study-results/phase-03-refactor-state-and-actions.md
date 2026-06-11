---
phase: 3
title: "Refactor use-study-actions and workspace state to passage-scoped cache"
status: pending
priority: P1
effort: "2h"
dependencies: [1, 2]
---

# Phase 3: Refactor use-study-actions and workspace state to passage-scoped cache

## Overview

Rewrite `use-study-actions.ts` and `use-study-workspace-state.ts` to use passage-scoped cache. Replace global `artifacts` state with `resultsByPassageId`. Add cache-fetch logic for the aggregate API. Ensure all writes target the captured `passageId`, never a global "current" slot.

## Requirements

- `resultsByPassageId[selectedPassageId]` is the single source of rendered results
- Viewing state is per-passage: `viewingResultByPassageId[passageId]`
- On passage switch: fetch from aggregate API if no cache or stale (>60s)
- Race-safe: writes go to `resultsByPassageId[capturedPassageId]`, not global state
- Optimistic generation: add "running" result immediately, replace on success, mark "error" on failure

## Architecture

### use-study-actions.ts refactor

```
Returns:
  ├── handleActionClick(cardId) — optimistic + generate
  ├── handleSimplify() — unchanged (writes to passage state)
  └── (no more `artifacts` export)
```

Key changes:
- Remove `const [artifacts, setArtifacts] = useState<StudioItem[]>([])`
- All artifact mutations now go through `setState` writing to `resultsByPassageId[passageId]`
- `generateQuizArtifact`: optimistic "running" result → on success replace with "completed" + store questions in a separate detail cache
- `generateSummaryArtifact`: optimistic "running" result → on success replace with "completed"

### use-study-workspace-state.ts refactor

- `handleSelectDocument`: no longer clears `questions` or `viewingArtifactId`. Instead, triggers cache fetch for new passage.
- Initial state: `resultsByPassageId: {}`, `viewingResultByPassageId: {}`
- Remove `viewingArtifactId` from all state updates

### Detail cache (for quiz questions)

Quiz questions are too large for the metadata list. Store them separately:

```
type DetailCacheEntry = {
  questions?: QuestionData[]
  simplifiedContent?: string | null
  simplifiedLevel?: string | null
}

// In StudyState or alongside resultsByPassageId:
resultDetailById: Record<string, DetailCacheEntry>
```

When user opens a quiz result, fetch questions via server action if not cached. For summary, the data is already on the `PassageData` object.

### Cache fetch logic

New hook or extracted function:

```
function useStudyResultsCache(state, setState) {
  // On activePassageId change:
  //   1. Check resultsByPassageId[newId]
  //   2. If no entry or stale (>60s), fetch GET /api/study-results?passageId=newId
  //   3. Write to resultsByPassageId[newId]
  //   4. Never overwrite a different passage's cache
}
```

Use `AbortController` to cancel in-flight requests when passage changes.

## Related Code Files

- Modify: `src/features/study/use-study-actions.ts`
- Modify: `src/features/study/use-study-workspace-state.ts`
- Modify: `src/features/study/study-types.ts` (if DetailCacheEntry needed)
- Read: `src/app/api/study-results/route.ts` (from phase 2)

## Implementation Steps

1. **study-types.ts** — Add `DetailCacheEntry` type. Add `resultDetailById` to `StudyState`.

2. **use-study-workspace-state.ts**:
   - Update initial state shape (remove `viewingArtifactId`, `questions`, `generatingQuestions`; add `resultsByPassageId`, `viewingResultByPassageId`, `resultDetailById`)
   - `handleSelectDocument`: keep setting `activePassageId` and `status`, remove `questions: []` and `viewingArtifactId: null`
   - `handleUploadComplete`: same removals
   - `handleDeletePassage`: clean up `resultsByPassageId[deletedId]` and `viewingResultByPassageId[deletedId]`

3. **use-study-actions.ts** — Full rewrite:
   - Remove `const [artifacts, setArtifacts] = useState`
   - Helper: `updateCacheEntry(passageId, updater)` that safely mutates `resultsByPassageId[passageId]`
   - `handleActionClick`:
     - Create optimistic `StudioResult` with `status: "running"`
     - Insert into `resultsByPassageId[currentPassageId].data` (prepend)
     - Call generation API
     - On success: replace optimistic entry with `status: "completed"`, store detail in `resultDetailById`
     - On failure: mark entry `status: "error"`
   - `generateQuizArtifact`: capture passageId, write to `resultsByPassageId[capturedId]` only
   - `generateSummaryArtifact`: same pattern
   - Return `{ handleActionClick, handleSimplify }` (no `artifacts`)

4. **Cache fetch hook** (inline in page-client or extracted):
   - `useEffect` on `state.activePassageId`
   - If passageId is null, skip
   - Check `resultsByPassageId[passageId]`
   - If `status: "idle"` or `fetchedAt` older than `RESULT_STALE_TIME`, fetch
   - Use `AbortController` — cancel on cleanup
   - Write response to `resultsByPassageId[passageId]` with `status: "success"`

5. **page-client.tsx**: Wire up cache fetch. Pass `resultsByPassageId[activePassageId]` and `viewingResultByPassageId[activePassageId]` to studio panel instead of `artifacts` and `viewingArtifactId`.

## Success Criteria

- [ ] No global `artifacts` state exists
- [ ] Switching passages shows cached results or fetches from API
- [ ] Switching back to a previous passage uses cache (no fetch if fresh)
- [ ] Generating a quiz/summary adds optimistic result immediately
- [ ] Switching passages during generation does not corrupt visible state
- [ ] Failed generation marks the result as "error" in the correct passage cache
- [ ] `viewingArtifactId` no longer exists in `StudyState`

## Risk Assessment

**Highest-risk phase.** Touches core state management. Mitigate by:
- Keeping the change mechanical (rename + restructure, not logic change)
- Existing tests in phase 5 will validate behavior
- The cache fetch is additive — old behavior (server actions) still works for generation
