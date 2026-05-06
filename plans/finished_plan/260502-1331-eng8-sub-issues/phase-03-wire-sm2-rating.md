# Phase 3: Wire SM-2 Quality Rating (ENG-36)

**Priority:** Medium | **Effort:** S | **Status:** pending
**Linear:** [ENG-36](https://linear.app/english-reading-app/issue/ENG-36)
**Blocked by:** Phase 2 (ENG-33 — questions must generate correctly first)

## Context

Right panel tracks answers and shows feedback, but never submits quality ratings to SM-2 spaced repetition. `CardReview` records never created for study page answers. Due card review flow on `/progress` has no data from study page.

Existing infrastructure:
- `src/lib/algorithms/sm2.ts` — complete SM-2 implementation (`calculateSM2`, `getSuggestedRating`)
- `src/lib/db/utils.ts` — `createCardReview()`, `updateCardReview()`, `getDueCards()`
- `src/app/api/cards/review/route.ts` — POST endpoint accepting `{ cardReviewId, qualityRating }`

## Requirements

- After each answer, map correctness to SM-2 quality rating (0-5)
- Call card review API to update spaced repetition state
- Non-blocking — doesn't slow down test flow
- `/progress` page reflects study page answers

## Quality Rating Mapping

| Scenario | Quality | Rationale |
|---|---|---|
| Correct on first try | 5 | Perfect recall |
| Correct but hesitated | 4 | Good recall with effort |
| Incorrect, then correct | 3 | Learned after mistake |
| Incorrect | 1 | Failed recall |

## Files to Modify

| File | Action |
|---|---|
| `src/app/(dashboard)/study/study-right-panel.tsx` | Add SM-2 rating call after answer submit |
| `src/app/actions/analyze.ts` | Create `CardReview` records after question generation |
| `src/lib/db/utils.ts` | Verify `createCardReview` works for new questions |

## Implementation Steps

### Step 1: Create CardReview records after analysis
In `studyAnalyzeAction`, after questions are generated and saved to DB:
- For each question, call `createCardReview()` to initialize SM-2 state
- This ensures cards exist in DB before user starts answering

Check `createCardReview` signature in `src/lib/db/utils.ts` — it likely needs `userId`, `questionId`, and initial SM-2 state.

### Step 2: Add quality rating submission to right panel
In `study-right-panel.tsx`, after `handleCheckAnswer`:
```typescript
// After setting isCorrect in state
const quality = isCorrect ? 5 : 1;  // Simple mapping for MVP
await fetch('/api/cards/review', {
  method: 'POST',
  body: JSON.stringify({ cardReviewId, qualityRating: quality }),
});
```

Key considerations:
- Fire-and-forget (don't `await` if it would block UI) — or `await` but don't block next question navigation
- Need `cardReviewId` available — must be returned from analysis or fetched when question loads
- Handle API failure gracefully (log, don't crash)

### Step 3: Ensure CardReview IDs available
Two approaches (pick simpler):
- **Option A:** Return `cardReviewId` alongside each question from `studyAnalyzeAction`
- **Option B:** Fetch/create CardReview on-demand in right panel when user submits first answer

Option A is cleaner — extend `QuestionData` type to include `cardReviewId`.

### Step 4: Verify end-to-end
- Upload → analyze → answer questions
- Check DB: `CardReview` records created with correct SM-2 state
- Check DB: `easeFactor`, `intervalDays`, `nextReviewDate` updated after answers
- Check `/progress` page: due cards reflect study session

## Acceptance Criteria

- [ ] CardReview records created for each question after analysis
- [ ] Each answered question submits quality rating to `/api/cards/review`
- [ ] SM-2 algorithm updates easeFactor, intervalDays, nextReviewDate
- [ ] API call is non-blocking (doesn't slow test flow)
- [ ] `/progress` page shows updated due cards after study session
- [ ] Build passes

## Risks

- `createCardReview` may need user ID — currently hardcoded to `demo@example.com`
- Network failure on rating submission shouldn't disrupt test UX
- Phase 2 must be complete — broken question generation means nothing to rate
