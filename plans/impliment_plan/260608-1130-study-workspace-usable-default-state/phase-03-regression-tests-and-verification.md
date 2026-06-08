---
phase: 3
title: "Regression Tests And Verification"
status: pending
priority: P1
effort: "1h"
dependencies: [1, 2]
---

# Phase 3: Regression Tests And Verification

## Overview

Update focused tests for the new active-passage contract and run the minimum verification gates needed for a P1 first-flow UX change.

## Requirements

- Functional: hook tests cover newest-passage defaulting and delete fallback.
- Functional: existing upload, delete error, and document sorting behavior stays covered.
- Non-functional: avoid brittle snapshot tests for panel markup; test logic where the risk is highest.
- Non-functional: run lint after UI import cleanup.

## Architecture

Use the existing `src/features/study/use-study-workspace-state.test.ts` hook suite. It already mocks `studyDeletePassageAction` and has representative passages with different `createdAt` values.

Optional component-level tests are not required for this simple plan unless implementation exposes a regression that the hook tests cannot catch.

## Related Code Files

- Modify: `src/features/study/use-study-workspace-state.test.ts`

## Implementation Steps

1. Update the initial-state test to expect `activePassageId: "passage-b"`, `activePassage` equal to `passageB`, and `status: "ready"` when initial passages exist.
2. Add or adjust a test for empty `initialPassages` to preserve `activePassageId: null` and `status: "idle"`.
3. Update the active-delete test to expect fallback to `passage-a`, cleared questions, and `status: "ready"`.
4. Add a test for deleting a non-active passage preserving the active passage.
5. Keep upload success/error and delete failure assertions.
6. Run `pnpm exec vitest run src/features/study/use-study-workspace-state.test.ts`.
7. Run `pnpm run lint`.
8. Manual smoke check:
   - Saved passages account: `/en/study` opens newest passage.
   - Empty account/state: content panel CTA opens upload modal.
   - Delete selected source with another source remaining selects the remaining newest source.
   - Search sources does not change the active content.

## Success Criteria

- [ ] Hook tests encode the new workspace active-state contract.
- [ ] Focused Vitest command passes.
- [ ] Lint passes with no unused imports after UI cleanup.
- [ ] Manual smoke confirms the first visible learner flow feels connected.

## Risk Assessment

Low risk. The most likely issue is a stale test expectation or unused icon import after removing fake controls. Mitigate with the targeted Vitest run and lint.
