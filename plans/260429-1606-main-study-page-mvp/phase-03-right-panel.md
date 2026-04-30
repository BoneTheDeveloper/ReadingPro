# Phase 03: Right Panel — Choice-Answer Test (ENG-7)

**Priority:** High | **Status:** Pending | **Dependencies:** Phase 01

---

## Context

- Linear: [ENG-7](https://linear.app/english-reading-app/issue/ENG-7/implement-right-panel-choice-answer-flashcard-test)
- Replaces: `test/[id]/flashcard-test-client.tsx` (320 lines — needs splitting for 200-line limit)

## Key Insights

- `FlashcardTestClient` has excellent UX: keyboard shortcuts (1-4/Enter), streak tracking, progress bar, source citations
- Current component includes passage display (left side) + question panel (right side) — for the new right panel, we only need the question/answer part
- Source citations reference `passage.content` — in new flow, passage is in left panel, so source citations still work as informational references
- The existing component is 320 lines — we need to extract just the question/answer logic (~200 lines)

## Requirements

- **Empty state**: Placeholder when no content uploaded
- **Test state**: One question at a time, A/B/C/D options, submit, feedback, score
- **Complete state**: Final score summary, option to retry or upload new content

## Architecture

```
study-right-panel.tsx
├── status !== 'ready'             → EmptyPlaceholder
├── status === 'ready' && !complete → QuestionView
└── status === 'ready' && complete  → CompleteSummary
```

Props interface:
```typescript
interface StudyRightPanelProps {
  questions: QuestionData[];
  passageContent: string;  // For source citations
  passageTitle: string;
  onReset: () => void;     // Trigger new upload
}
```

## Files to Modify

| File | Change |
|------|--------|
| `src/app/(dashboard)/study/study-right-panel.tsx` | Implement 3 states |

## Files to Reference (Read-Only)

- `src/app/(dashboard)/test/[id]/flashcard-test-client.tsx` — Adapt question/answer logic
- `src/lib/utils.ts` — cn() utility

## Implementation Steps

1. **Empty state**:
   - Centered placeholder with `BookOpen` icon
   - Text: "Upload content to start testing"
   - Subtle, muted appearance (`text-neutral-400`)

2. **Test state** (adapted from `FlashcardTestClient`):
   - Header: progress bar + question counter ("3 of 5") + streak counter
   - Question number badge + "Multiple Choice" label
   - Question text
   - 4 answer options as clickable cards (same styling as existing)
   - Submit button (disabled until answer selected)
   - After submit: correct/incorrect feedback with explanation + source citation
   - Next button to advance
   - Keyboard shortcuts: 1-4 select, Enter submit/next
   - **Remove**: passage display section (now in left panel)
   - **Remove**: back navigation button
   - **Remove**: full-page wrapper (`min-h-screen`)

3. **Complete state** (adapted from `FlashcardTestClient`):
   - Trophy icon + "Reading Complete!" heading
   - Score: correct count + accuracy percentage
   - Message based on accuracy (Excellent/Good/Keep practicing)
   - "Try Again" button (resets test state)
   - "New Passage" button (calls `onReset` to trigger new upload)

## Todo Checklist

- [ ] Implement empty state placeholder
- [ ] Implement test state (question display + options + feedback)
- [ ] Implement keyboard shortcuts (1-4, Enter)
- [ ] Implement score tracking + streak
- [ ] Implement source citations in feedback
- [ ] Implement complete state (score summary)
- [ ] Wire `onReset` callback to parent

## Success Criteria

- Placeholder shows when no content
- Questions display one at a time after analysis
- Answer selection (click + keyboard) works
- Correct/incorrect feedback with explanation shows after submit
- Source citation references passage text
- Score tracking and streak visible
- Navigate between questions
- Complete state shows final score
- File stays under 200 lines
