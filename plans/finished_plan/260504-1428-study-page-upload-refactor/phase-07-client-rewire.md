---
title: "Phase 7: Rewire Client Orchestrator"
description: "Update study-page-client.tsx to wire new actions, state, and panel props"
status: pending
priority: P1
effort: 1.5h
branch: main
tags: [client, orchestrator, integration]
created: 2026-05-04
---

## Context Links
- Plan: [plan.md](./plan.md)
- Types: [phase-02-update-types.md](./phase-02-update-types.md)
- Server actions: [phase-01-split-server-actions.md](./phase-01-split-server-actions.md)
- Modal: [phase-03-upload-modal.md](./phase-03-upload-modal.md)
- Left panel: [phase-04-left-panel.md](./phase-04-left-panel.md)
- Content panel: [phase-05-content-panel.md](./phase-05-content-panel.md)
- Right panel: [phase-06-right-panel.md](./phase-06-right-panel.md)
- Current file: `src/app/(dashboard)/study/study-page-client.tsx` (115 lines)

## Overview
This is the integration phase. Update `StudyPageClient` to:
1. Use new split server actions instead of monolithic `studyAnalyzeAction`
2. Manage new state fields (`simplifying`, `generatingQuestions`, `uploadModalOpen`)
3. Pass correct props to all 3 updated panels + modal
4. Handle the new upload flow (modal -> upload action -> add passage to state)

## Current State Shape
```typescript
const initialState: StudyState = {
  passages: [],
  activePassageId: null,
  questions: [],
  status: 'idle',
  error: null,
};
```

## New State Shape (from Phase 2)
```typescript
const initialState: StudyState = {
  passages: [],
  activePassageId: null,
  questions: [],
  status: 'idle',
  error: null,
  simplifying: false,
  generatingQuestions: false,
  uploadModalOpen: false,
};
```

## New Handlers

### handleUploadComplete
```
Called by: Upload modal on success
Input: passage data from studyUploadAction
Effect: Add passage to passages[], set activePassageId, close modal
```

### handleSimplify
```
Called by: Content panel Simplify button
Input: (uses activePassageId from state)
Effect: Set simplifying=true, call studySimplifyAction(passageId),
        update passage in state with simplifiedContent/simplifiedLevel,
        set simplifying=false
```

### handleGenerateQuestions
```
Called by: Right panel Generate button
Input: (uses activePassageId from state)
Effect: Set generatingQuestions=true, call studyGenerateQuestionsAction(passageId),
        set questions in state, set generatingQuestions=false
```

### handleOpenUploadModal / handleCloseUploadModal
```
Simple toggles for uploadModalOpen state
```

## Implementation Steps

1. Update imports:
   - Remove: `studyAnalyzeAction`
   - Add: `studyUploadAction`, `studySimplifyAction`, `studyGenerateQuestionsAction`
   - Add: `StudyUploadModal` component

2. Update initial state with new fields (all `false`)

3. Replace `handleAnalyze` with `handleUploadComplete`:
   ```typescript
   const handleUploadComplete = useCallback((passage: PassageData) => {
     setState(prev => ({
       ...prev,
       passages: [...prev.passages, passage],
       activePassageId: passage.id,
       uploadModalOpen: false,
       status: 'ready',
     }));
   }, []);
   ```

4. Add `handleSimplify`:
   ```typescript
   const handleSimplify = useCallback(async () => {
     if (!state.activePassageId) return;
     setState(prev => ({ ...prev, simplifying: true, error: null }));
     try {
       const result = await studySimplifyAction({ passageId: state.activePassageId });
       if (result.error) {
         setState(prev => ({ ...prev, simplifying: false, error: result.error }));
         return;
       }
       setState(prev => ({
         ...prev,
         simplifying: false,
         passages: prev.passages.map(p =>
           p.id === prev.activePassageId
             ? { ...p, simplifiedContent: result.simplifiedContent, simplifiedLevel: result.simplifiedLevel }
             : p
         ),
       }));
     } catch (err) {
       setState(prev => ({ ...prev, simplifying: false, error: err.message }));
     }
   }, [state.activePassageId]);
   ```

5. Add `handleGenerateQuestions`:
   ```typescript
   const handleGenerateQuestions = useCallback(async () => {
     if (!state.activePassageId) return;
     // Warn if questions already exist (quiz progress will be lost)
     if (state.questions.length > 0) {
       const confirmed = window.confirm('Regenerating will replace existing questions and reset quiz progress. Continue?');
       if (!confirmed) return;
     }
     setState(prev => ({ ...prev, generatingQuestions: true, error: null }));
     try {
       const result = await studyGenerateQuestionsAction({ passageId: state.activePassageId });
       if (result.error) {
         setState(prev => ({ ...prev, generatingQuestions: false, error: result.error }));
         return;
       }
       setState(prev => ({
         ...prev,
         generatingQuestions: false,
         questions: result.questions,
       }));
     } catch (err) {
       setState(prev => ({ ...prev, generatingQuestions: false, error: err.message }));
     }
   }, [state.activePassageId, state.questions.length]);
   ```

6. Add modal open/close handlers:
   ```typescript
   const handleOpenUploadModal = useCallback(() => {
     setState(prev => ({ ...prev, uploadModalOpen: true }));
   }, []);
   const handleCloseUploadModal = useCallback(() => {
     setState(prev => ({ ...prev, uploadModalOpen: false }));
   }, []);
   ```

7. Update `StudySourcesPanel` props:
   ```tsx
   <StudySourcesPanel
     documents={documents}
     activeId={state.activePassageId}
     onSelect={handleSelectDocument}
     onOpenUploadModal={handleOpenUploadModal}
     isUploading={state.status === 'uploading'}
   />
   ```

8. Update `StudyContentPanel` props:
   ```tsx
   <StudyContentPanel
     passage={activePassage}
     error={state.error}
     simplifying={state.simplifying}
     onSimplify={handleSimplify}
   />
   ```

9. Update `StudyStudioPanel` props:
   ```tsx
   <StudyStudioPanel
     questions={state.activePassageId ? state.questions : []}
     passageTitle={activePassage?.title ?? ''}
     hasActivePassage={!!state.activePassageId}
     generatingQuestions={state.generatingQuestions}
     onGenerateQuestions={handleGenerateQuestions}
     onReset={handleReset}
   />
   ```

10. Add `StudyUploadModal` render:
    ```tsx
    <StudyUploadModal
      isOpen={state.uploadModalOpen}
      onClose={handleCloseUploadModal}
      onUploadComplete={handleUploadComplete}
    />
    ```

11. Remove old `handleAnalyze` callback and `status` prop pass-throughs

12. File size check: adding handlers increases from 115 to ~200 lines. If over, extract handlers into a custom hook.

## Todo List
- [ ] Update imports (remove old action, add new actions + modal)
- [ ] Update initial state
- [ ] Replace `handleAnalyze` with `handleUploadComplete`
- [ ] Add `handleSimplify`
- [ ] Add `handleGenerateQuestions`
- [ ] Add modal open/close handlers
- [ ] Update all 3 panel prop passes
- [ ] Add modal render
- [ ] File size check — extract custom hook if over 200 lines
- [ ] Full integration test: upload → read → simplify → generate questions

## Success Criteria
- Upload via modal creates passage, shows in sources, auto-selects
- Click source card loads content in center panel
- Simplify button triggers on-demand simplification
- Generate Questions button creates questions visible in Q&A tab
- All loading states work (modal spinner, simplify spinner, generate spinner)
- Error handling: errors displayed in appropriate panel
- No TypeScript errors
- File under 200 lines (or extracted custom hook)

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| State update race condition (simplify + generate simultaneously) | Low | Medium | Disable both buttons when either is active |
| Stale closure in callbacks | Medium | Low | Use setState with prev callback pattern |
| File exceeds 200 lines | High | Low | Extract handlers into `useStudyActions` custom hook |

## Rollback Plan
Revert `study-page-client.tsx` to use old `studyAnalyzeAction`. All other panel files are independent — reverting only the orchestrator restores old behavior.
