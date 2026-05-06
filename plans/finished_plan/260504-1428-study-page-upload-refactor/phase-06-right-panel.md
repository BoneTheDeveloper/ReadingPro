---
title: "Phase 6: Refactor Right Panel"
description: "Add real Generate Questions button with loading state"
status: pending
priority: P1
effort: 1h
branch: main
tags: [right-panel, studio, generate]
created: 2026-05-04
---

## Context Links
- Plan: [plan.md](./plan.md)
- Types: [phase-02-update-types.md](./phase-02-update-types.md)
- Server actions: [phase-01-split-server-actions.md](./phase-01-split-server-actions.md)
- Current file: `src/app/(dashboard)/study/study-right-panel.tsx` (438 lines)

## Overview
Replace the placeholder "Generate" tab content with a real "Generate Questions" button. Add loading state during generation. Wire the button to trigger question generation via the new server action.

## Current Behavior
- `GenerateContent()` shows placeholder text: "Questions are auto-generated when you upload content"
- No interactive elements in Generate tab
- Q&A tab works as before (quiz)

## Required Changes

### Props Interface Update
```typescript
// OLD
interface StudyStudioPanelProps {
  status: StudyStatus;
  questions: QuestionData[];
  passageTitle: string;
  onReset: () => void;
}

// NEW
interface StudyStudioPanelProps {
  questions: QuestionData[];
  passageTitle: string;
  hasActivePassage: boolean;
  generatingQuestions: boolean;
  onGenerateQuestions: () => void;
  onReset: () => void;
}
```

### GenerateContent Component Rewrite
Replace the static placeholder with an interactive component:

**States:**
1. **No passage selected** → "Select a document first" message
2. **Passage selected, no questions** → "Generate Questions" button (primary, prominent)
3. **Generating** → Button disabled with spinner, "Generating..." text
4. **Questions exist** → "Regenerate Questions" button (secondary style) + question count badge. Clicking shows **confirm dialog** warning about lost quiz progress before proceeding.

### Button Behavior
- Disabled when `!hasActivePassage || generatingQuestions`
- Shows spinner when `generatingQuestions`
- On click: calls `onGenerateQuestions()`
- After generation: questions appear in Q&A tab (parent state update)

## Implementation Steps

1. Update `StudyStudioPanelProps` — remove `status`, add `hasActivePassage`, `generatingQuestions`, `onGenerateQuestions`

2. Rewrite `GenerateContent` component:
   - Accept new props: `hasActivePassage`, `generatingQuestions`, `onGenerateQuestions`, `questionCount`
   - No passage: centered message "Select a document from Sources first"
   - Passage + no generation in progress:
     ```tsx
     <button onClick={onGenerateQuestions} disabled={!hasActivePassage}>
       <Sparkles icon /> Generate Questions
     </button>
     ```
   - Generating:
     ```tsx
     <button disabled>
       <Loader2 className="animate-spin" /> Generating...
     </button>
     ```
   - Questions exist: show count + "Regenerate" option

3. Update `QuizContent` — remove `status` prop dependency, use `questions.length === 0` for empty state instead

4. Pass new props from `StudyStudioPanel` down to `GenerateContent` and `QuizContent`

5. File size: currently 438 lines. After changes should stay similar. If over 200 lines, extract `QuizContent` into its own file.

### File Split Strategy (if needed)
Current file is 438 lines. To get under 200:
- Extract `QuizContent` (~340 lines) into `src/app/(dashboard)/study/study-quiz-content.tsx`
- Keep `StudyStudioPanel` + `GenerateContent` in `study-right-panel.tsx` (~100 lines)

## Todo List
- [ ] Update props interface for `StudyStudioPanelProps`
- [ ] Rewrite `GenerateContent` with interactive generate button
- [ ] Update `QuizContent` to remove `status` dependency
- [ ] Evaluate file size — extract `QuizContent` if over 200 lines
- [ ] Verify compilation

## Success Criteria
- Generate tab shows real "Generate Questions" button
- Button disabled when no passage selected
- Loading state during generation
- Questions appear in Q&A tab after generation
- Regenerate option available when questions already exist
- All files under 200 lines

## Risk Assessment
| Risk | Mitigation |
|------|-----------|
| File too large after changes | Extract QuizContent into separate file |
| Double-click generate | Disable button during `generatingQuestions` |
| Questions replaced during active quiz | Confirm dialog warns user; on confirm, reset quiz state + regenerate |

## Next Steps
- Phase 7: Client rewire passes new props to right panel
