---
phase: 7
title: "Simplify StudyWorkspace wiring"
status: completed
priority: P3
effort: "1h"
dependencies: ["phase-04-create-usecontentstate-hook", "phase-05-create-studio-hooks", "phase-06-simplify-studiopanel-props"]
---

# Phase 7: Simplify StudyWorkspace wiring

## Overview

Final cleanup: remove redundant dual passages state, remove dead code, ensure workspace is a clean wire layer.

## Context Links

- Related: `src/app/[locale]/(dashboard)/study/_hooks/use-study-workspace.ts`
- Related: `src/app/[locale]/(dashboard)/study/_components/study-workspace.tsx`

## Requirements

- Functional: All workspace behavior unchanged
- Non-functional: Single source of truth for passages, clean hook usage, < 150 lines

## Architecture

### Remove Redundant State

Current `use-study-workspace.ts` has both:
```ts
const [passages, setPassages] = useState<PassageData[]>(initialPassages);  // ← REMOVE
const [state, setState] = useState<StudyState>(() => ({
  passages: initialPassages,  // ← KEEP
  ...
}));
```

Target: `state.passages` is the single source of truth.

### Final Hook Wiring

```tsx
// study-workspace.tsx
const { state, activePassage, documents, isUploading, uploadingFileName, ... } = useStudyWorkspaceState(initialPassages);
const artifactQuery = useStudioArtifactQuery({ passageId: state.activePassageId });
const quizMutation = useQuizMutation({
  passageId: state.activePassageId,
  artifacts: artifactQuery.artifacts,
  setArtifacts: (updater) => { /* update state */ }
});
const layout = useStudyPanelLayout();

// Pass to panels
<SourcesPanel documents={documents} ... />
<ContentPanel passage={activePassage} error={state.error} />
<StudioPanel
  artifacts={artifactQuery.artifacts}
  status={artifactQuery.status}
  viewingArtifact={artifactQuery.viewingArtifact}
  artifactDetailById={artifactQuery.artifactDetailById}
  onActionClick={quizMutation.handleActionClick}
  onRecordQuizResult={quizMutation.handleRecordQuizResult}
  onResetQuizResult={quizMutation.handleResetQuizResult}
  ...
/>
```

## Related Code Files

- **Modify:** `src/app/[locale]/(dashboard)/study/_hooks/use-study-workspace.ts`
- **Modify:** `src/app/[locale]/(dashboard)/study/_components/study-workspace.tsx`

## Implementation Steps

1. In `use-study-workspace.ts`:
   - Remove standalone `passages` state
   - Update all handlers to use `setState(prev => ({ ...prev, passages: ... }))`
   - Remove `passages` from return object
   - Update derivations to use `state.passages`
2. In `study-workspace.tsx`:
   - Wire `useStudioArtifactQuery` + `useQuizMutation`
   - Remove all dead imports and code
   - Pass narrow props to panels
3. Run `pnpm typecheck && pnpm lint && pnpm knip`
4. Manual smoke test: upload, select, translate, generate quiz

## Success Criteria

- [ ] Only one `passages` source of truth in `state.passages`
- [ ] No standalone `passages` or `setPassages` anywhere
- [ ] `study-workspace.tsx` < 150 lines
- [ ] All hooks wired correctly
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` pass

## Risk Assessment

- **Risk:** Medium — closure changes when removing outer `passages` scope
- **Mitigation:** Use functional state updaters throughout
