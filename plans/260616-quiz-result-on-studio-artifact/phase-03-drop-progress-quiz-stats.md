# Phase 03 — Drop Progress Quiz Stats

## Overview

- Priority: P1
- Status: Not started
- Remove the quiz_attempts aggregation and the 3 quiz cards from the progress
  dashboard. Stats are dropped, not re-pointed (product decision).

## Requirements

- `getUserProgress` no longer queries `quiz_attempts` and no longer returns
  `totalQuizAttempts`, `avgQuizAccuracy`, `todayQuizAttempts`.
- All other progress data (cards, reviews, streak, study time from `study_sessions`)
  unchanged.
- Progress dashboard drops the "Quizzes Completed", "Avg. Accuracy", and
  "Today's Quizzes" cards.

## Related Code Files

Modify:
- `src/lib/db/quiz/quiz-review.ts` — remove the `quizRows` `$queryRaw` (the
  `quiz_attempts` SELECT), the `Promise.all` entry, and the three returned quiz fields.
- `src/features/progress/progress-dashboard.tsx` — remove the 3 stat cards
  (lines referencing `totalQuizAttempts`, `avgQuizAccuracy`, `todayQuizAttempts`).
- `src/lib/db/quiz/quiz-review.test.ts` — drop quiz-attempt aggregation expectations.

## Implementation Steps

1. Delete the `quiz_attempts` raw query + destructure in `getUserProgress`.
2. Remove the 3 quiz fields from its return object.
3. Remove the 3 cards from the dashboard.
4. Update `quiz-review.test.ts` fixtures/expectations.
5. `pnpm run typecheck`.

## Todo

- [ ] `getUserProgress` quiz aggregation removed
- [ ] Return shape trimmed
- [ ] Dashboard cards removed
- [ ] Tests updated
- [ ] Typecheck green

## Success Criteria

- No reference to `quiz_attempts` remains in `quiz-review.ts`.
- Progress dashboard renders without the quiz cards and without runtime errors.

## Risk Assessment

- Downstream consumers of the removed return fields: confirm only the dashboard reads
  them (verified: progress-dashboard is the sole consumer of the quiz stat fields).
