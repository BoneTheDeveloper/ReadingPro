# Phase 02 — Remove Dead Question-SRS + SM-2

## Overview

- Priority: P0
- Status: Not started
- Depends on: Phase 01
- Delete the unwired SM-2 "cards" subsystem end to end. Verified dead:
  `createQuestionReview` never called, `/api/cards/*` no UI consumer, card stats always 0.

## Requirements

- Remove the `question_reviews` data access + SM-2 question scheduling.
- Remove the `/api/cards/due` and `/api/cards/review` routes.
- Remove `sm2()` and the already-dead helpers `isDue`, `statusFor`,
  `getSuggestedRating` from `scheduler.ts`. Keep `simpleSchedule()` (vocab) +
  `SRSState`/`SRSResult` only if still referenced by vocab (they are not — remove if
  orphaned).
- Remove the `question_reviews` aggregation from `getUserProgress`
  (`totalCards`/`matureCards`/`dueCards`/`todayReviews`).
- Remove the now-unused DTOs/schemas (`toQuestionReviewDto`, `dueQuestions*` schemas,
  question-review schemas).

## Related Code Files

Delete:
- `src/app/api/cards/due/route.ts`
- `src/app/api/cards/review/route.ts`
- `src/lib/db/quiz/quiz-review.ts` IF nothing non-dead remains. Note: it also hosts
  `getUserProgress` — if so, keep the file but strip the question-review functions
  (`getDueQuestions`, `updateQuestionReview`, `createQuestionReview`,
  `calculateSM2Interval`) and the `question_reviews` query inside `getUserProgress`.
- `src/lib/db/quiz/quiz-review.test.ts` cases covering removed functions.

Modify:
- `src/lib/spaced-repetition/scheduler.ts` — remove `sm2`, `isDue`, `statusFor`,
  `getSuggestedRating` (+ SM-2-only types if orphaned).
- `src/lib/study/shared/study-response-schema.ts` — remove question-review DTO/schemas.
- `tests/vitest/mocks/db.ts` — remove `questionReview` model mock.
- `src/lib/spaced-repetition/scheduler.test.ts` — drop SM-2/helper tests.

## Implementation Steps

1. Delete cards routes.
2. Strip question-review functions + the `question_reviews` query from `quiz-review.ts`
   (preserve the rest of `getUserProgress`).
3. Remove SM-2 + dead helpers from `scheduler.ts`.
4. Remove question-review DTOs/schemas + db mock.
5. `pnpm run typecheck` + targeted tests.

## Todo

- [ ] cards routes deleted
- [ ] question-review queries + SM-2 question fns removed
- [ ] `getUserProgress` quiz_attempts/question_reviews queries removed (coordinate w/ 04)
- [ ] `sm2()` + dead helpers removed
- [ ] DTOs/schemas/mocks cleaned
- [ ] Typecheck + tests green

## Success Criteria

- No reference to `QuestionReview`, `question_reviews`, `/api/cards`, or `sm2` in code.
- `scheduler.ts` exports only `simpleSchedule` (+ any helper still used by vocab).

## Notes

- `getUserProgress` is shared with Phase 04 (progress trim). Remove both the
  `question_reviews` and `quiz_attempts` aggregations together; keep streak/time logic.
