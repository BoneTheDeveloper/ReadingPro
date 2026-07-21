---
phase: 6
title: "Simplify StudioPanel props"
status: completed
priority: P2
effort: "1h"
dependencies: ["phase-05-create-studio-hooks"]
---

# Phase 6: Simplify StudioPanel props

## Overview

Update `StudioPanel` props to use the narrow outputs from `useStudioArtifactQuery` and `useQuizMutation`.

## Context Links

- Related: `src/features/studio-panel/components/studio-panel.tsx`

## Requirements

- Functional: Library view, artifact detail view, chat overlay — all unchanged
- Non-functional: Narrow, typed props

## Architecture

**Target props:**
```ts
artifacts: StudioArtifact[]                       ← from useStudioArtifactQuery
status: "idle" | "loading" | "success" | "error" ← from useStudioArtifactQuery
viewingArtifact: ArtifactRef | null              ← from useStudioArtifactQuery
artifactDetailById: Record<string, ArtifactDetailCacheEntry> ← from useStudioArtifactQuery
activePassage: PassageData | null                ← from workspace
hasActivePassage: boolean                        ← from workspace
onActionClick: (actionId) => void              ← from useQuizMutation
onRecordQuizResult: (artifactId, stats) => void ← from useQuizMutation
onResetQuizResult: (artifactId) => void         ← from useQuizMutation
collapsed?: boolean
onToggleCollapse: () => void
```

**Internal state (owned by StudioPanel):**
- `chatOpen: boolean`
- `chatPrefill: string | null`

## Related Code Files

- **Modify:** `src/features/studio-panel/components/studio-panel.tsx`

## Implementation Steps

1. Read `studio-panel.tsx`
2. Update `StudioPanelProps`:
   - Replace `artifactsCache` → `artifacts` + `status`
   - Replace `viewingArtifactRef` → `viewingArtifact`
   - Keep `artifactDetailById`
   - Remove `onSetViewingArtifact` → use `setViewingArtifact` from hook
3. Update internal usage:
   - Remove `viewingArtifactRef ? artifacts.find(...) : null` → use `viewingArtifact` directly
   - Remove `artifactsCache.status` → use `status` directly
   - Update retry button logic: **remove retry button entirely**
4. Update `study-workspace.tsx`:
   - Pass narrow props from hooks to StudioPanel
5. Verify `pnpm typecheck`

## Success Criteria

- [ ] StudioPanel props match target contract
- [ ] `artifacts` + `status` replace `artifactsCache`
- [ ] `viewingArtifact` used directly (no find)
- [ ] Retry button removed from failed artifact cards
- [ ] `pnpm typecheck` passes

## Risk Assessment

- **Risk:** Low — renaming props + removing retry UI
- **Mitigation:** Simple rename + one UI removal
