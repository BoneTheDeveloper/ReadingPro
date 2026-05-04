---
title: "Phase 2: Update Types"
description: "Add new state fields and props interfaces for split pipeline"
status: pending
priority: P1
effort: 0.5h
branch: main
tags: [types, state]
created: 2026-05-04
---

## Context Links
- Plan: [plan.md](./plan.md)
- Current file: `src/app/(dashboard)/study/study-types.ts`

## Overview
Extend `StudyState` with new boolean flags for on-demand operations. Add new props interfaces for modal and updated panels.

## Current State
```typescript
export type StudyStatus = 'idle' | 'uploading' | 'analyzing' | 'ready' | 'error';
export interface StudyState {
  passages: PassageData[];
  activePassageId: string | null;
  questions: QuestionData[];
  status: StudyStatus;
  error: string | null;
}
```

## Requirements

### StudyState changes
- Add `simplifying: boolean` — true while simplification API call in flight
- Add `generatingQuestions: boolean` — true while question generation in flight
- Add `uploadModalOpen: boolean` — controls upload modal visibility

### New interfaces
- `StudyUploadModalProps` — props for the upload modal component
- Updated `StudySourcesPanelProps` — add `onOpenUploadModal` callback
- Updated `StudyContentPanelProps` — remove `onAnalyze`, add `onSimplify`, `simplifying`
- Updated `StudyStudioPanelProps` — add `onGenerateQuestions`, `generatingQuestions`, `hasActivePassage`

## Implementation Steps

1. Add new fields to `StudyState`:
   ```typescript
   export interface StudyState {
     passages: PassageData[];
     activePassageId: string | null;
     questions: QuestionData[];
     status: StudyStatus;
     error: string | null;
     simplifying: boolean;
     generatingQuestions: boolean;
     uploadModalOpen: boolean;
   }
   ```

2. Update `StudyStatus` type — add `'simplifying'` as an alias or keep separate boolean (decision: keep separate boolean to avoid coupling with existing status flow)

3. Add `StudyUploadModalProps`:
   ```typescript
   export interface StudyUploadModalProps {
     isOpen: boolean;
     onClose: () => void;
     onUploadComplete: (passage: PassageData) => void;
   }
   ```

4. No changes needed to `PassageData`, `QuestionData`, `DocumentItem`, `QuestionOption` — they already have the right shape

## Todo List
- [ ] Add `simplifying`, `generatingQuestions`, `uploadModalOpen` to `StudyState`
- [ ] Add `StudyUploadModalProps` interface
- [ ] Verify TypeScript compilation

## Success Criteria
- `study-types.ts` compiles without errors
- All existing interfaces unchanged (backward compat)
- New fields have sensible defaults (all `false` / initial state)

## Next Steps
- Phase 3: Upload modal component uses `StudyUploadModalProps`
- Phase 4-6: Panels use updated props
