---
phase: 5
title: "Create studio hooks: useStudioArtifactQuery + useQuizMutation"
status: completed
priority: P2
effort: "3h"
dependencies: ["phase-01-fix-broken-import"]
---

# Phase 5: Create studio hooks

## Overview

Split the current `use-studio-panel.ts` into two focused hooks: `useStudioArtifactQuery` (data fetching + `viewingArtifact` state) and `useQuizMutation` (mutations). No retry logic. Failed artifacts are never stored in DB.

## Context Links

- Design: `plans/brainstorm-reports/260721-study-workspace-panel-state-design.md`
- Related: `src/features/studio-panel/hooks/use-studio-panel.ts`
- Related: `src/features/studio-panel/hooks/use-studio-artifacts.ts`

## Requirements

- Functional: Artifacts fetch, artifact click (sets viewingArtifact), quiz generate, record/reset result — all work
- Non-functional: No retry for failed artifacts, no `retryingIdsRef`, no `StudyState` type

## Architecture

### `useStudioArtifactQuery` — data fetch + viewing state

```
src/features/studio-panel/hooks/use-studio-artifact-query.ts   ← NEW

useStudioArtifactQuery({ passageId }) {
  // State
  artifacts: StudioArtifact[]
  status: "idle" | "loading" | "success" | "error"
  viewingArtifact: ArtifactRef | null    ← which artifact detail is open
  artifactDetailById: Record<string, ArtifactDetailCacheEntry>

  // Effects
  - Fetch artifacts from getStudioArtifactsAction on passageId change
  - Sentry error reporting

  // Returns
  { artifacts, status, viewingArtifact, artifactDetailById,
    setViewingArtifact(ref | null): void }
}
```

### `useQuizMutation` — mutations only

```
src/features/studio-panel/hooks/use-quiz-mutation.ts   ← NEW

useQuizMutation({ passageId, artifacts, onUpdateArtifact }) {
  // Refs
  passageIdRef: RefObject<string | null>

  // Callbacks
  handleActionClick(actionId: StudioActionId): Promise<void>
    - Only handles "quiz" action
    - Creates optimistic card { status: "generating" } in artifacts
    - Calls generateStudioQuestionsAction
    - On fail: updates card to { status: "failed", errorCode, errorDetail } in artifacts
    - On success: updates card with returned artifact
    - NO retry logic

  handleRecordQuizResult(artifactId, stats): void
    - Updates quiz result in artifacts cache

  handleResetQuizResult(artifactId): void
    - Clears quiz result in artifacts cache
}
```

### What Gets Removed

- `retryQuizArtifact` — removed
- `retryingIdsRef` — removed
- `StudyState` type import — removed
- Full `state` / `setState` / `passages` props — removed

### Failed Artifact Behavior

- Server: never stores failed artifacts (already the case — only success commits)
- Client: optimistic card updates to `{ status: "failed", errorCode, errorDetail }`
- Failed card stays visible in UI with error message
- No retry button — user must click "Generate" again manually
- On passage switch: failed cards cleared from memory

## Related Code Files

- **Create:** `src/features/studio-panel/hooks/use-studio-artifact-query.ts`
- **Create:** `src/features/studio-panel/hooks/use-quiz-mutation.ts`
- **Delete:** `src/features/studio-panel/hooks/use-studio-panel.ts` (replaced)
- **Delete:** `src/features/studio-panel/hooks/use-studio-artifacts.ts` (replaced)
- **Modify:** `src/app/[locale]/(dashboard)/study/_hooks/use-study-workspace.ts` — wire new hooks

## Implementation Steps

1. Create `src/features/studio-panel/hooks/use-studio-artifact-query.ts`:
   - Move artifact fetching logic from `use-studio-artifacts.ts`
   - Move `viewingArtifactByPassageId` logic into `viewingArtifact` state
   - Move `artifactDetailById` state
   - Accept `{ passageId }` param
   - Return `{ artifacts, status, viewingArtifact, artifactDetailById, setViewingArtifact }`
2. Create `src/features/studio-panel/hooks/use-quiz-mutation.ts`:
   - Move `handleActionClick` from `use-studio-panel.ts`
   - Remove retry logic (delete `retryQuizArtifact`, `retryingIdsRef`)
   - Move `handleRecordQuizResult`, `handleResetQuizResult`
   - Accept `{ passageId, artifacts, setArtifacts }` where `setArtifacts` is a callback to update artifacts in parent
   - Import `generateStudioQuestions` from `use-studio-questions.ts`
3. Update `study-workspace.tsx`:
   - Replace `useStudioPanel` + `useStudioArtifacts` with `useStudioArtifactQuery` + `useQuizMutation`
   - Wire `setArtifacts` callback to update state
   - Pass `viewingArtifact`, `artifacts`, `status` to StudioPanel
4. Delete `use-studio-panel.ts` and `use-studio-artifacts.ts`
5. Verify `pnpm typecheck`

## Success Criteria

- [ ] `use-studio-artifact-query.ts` exists, fetches artifacts, owns viewingArtifact state
- [ ] `use-quiz-mutation.ts` exists, handles quiz generation, no retry
- [ ] Failed artifacts show error, no retry button
- [ ] `use-studio-panel.ts` and `use-studio-artifacts.ts` deleted
- [ ] `StudyState` type no longer referenced anywhere
- [ ] `pnpm typecheck` passes

## Risk Assessment

- **Risk:** Medium — replacing two hooks with three, changing component wiring
- **Mitigation:** Keep exact same logic for success path. Only remove retry. Test each path.
