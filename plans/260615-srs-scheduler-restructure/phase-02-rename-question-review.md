---
phase: 2
title: "Rename CardReview to QuestionReview"
status: pending
priority: P2
effort: "4h"
dependencies: [1]
---

# Phase 2: Rename CardReview → QuestionReview

## Overview
Rename the `CardReview` model and `card_reviews` table to `QuestionReview` /
`question_reviews`, move its query layer to `src/lib/db/quiz/quiz-review.ts`, and update
every consumer (cards routes, progress/stats, DTO, tests). It stays bound to `Question`
and uses `sm2()` from Phase 1.

## Requirements
- Functional: `api/progress/stats` (live) returns identical numbers, now reading
  `question_reviews`. `/api/cards/due` and `/api/cards/review` keep working against the
  renamed model. No data loss.
- Non-functional: a rename migration preserves rows (`ALTER TABLE ... RENAME`), not a
  drop/recreate.

## Architecture
`Question.reviews: QuestionReview[]`. Table `question_reviews`, same columns and
`@@unique([questionId, userId])`, `@@index([userId, nextReviewDate])`. Query module path
moves from `src/lib/db/card-review-queries.ts` → `src/lib/db/quiz/quiz-review.ts`;
`getUserProgress` moves with it and its raw SQL switches `"card_reviews"` →
`"question_reviews"`.

## Related Code Files
- Modify: `prisma/schema.prisma` — `model CardReview` → `QuestionReview`,
  `@@map("card_reviews")` → `@@map("question_reviews")`; update `Question.reviews` type.
- Create: `prisma/migrations/<ts>_rename_card_reviews_to_question_reviews/migration.sql`
  (`ALTER TABLE "card_reviews" RENAME TO "question_reviews";` + rename indexes/constraints).
- Rename: `src/lib/db/card-review-queries.ts` → `src/lib/db/quiz/quiz-review.ts`
  (`db.cardReview` → `db.questionReview`; raw SQL table name; rename
  `createCardReview`/`updateCardReview`/`getDueCards` if desired, keep behavior).
- Rename: `src/lib/db/card-review-queries.test.ts` → `quiz/quiz-review.test.ts`.
- Modify: `src/app/api/cards/due/route.ts`, `src/app/api/cards/review/route.ts` — import
  from new path.
- Modify: `src/app/api/progress/stats/route.ts` — import `getUserProgress` from new path.
- Modify: `src/lib/study/shared/study-response-schema.ts` — `toCardReviewDto` /
  `RawCardReview` rename to QuestionReview naming (keep DTO field shape stable for clients).

## Implementation Steps
1. Update `schema.prisma` model + map + relation; `pnpm prisma generate`.
2. Create the rename migration (table + indexes + FK/unique constraint names).
3. Move/rename the query file to `src/lib/db/quiz/quiz-review.ts`; switch `db.cardReview`
   → `db.questionReview` and the raw-SQL table name in `getUserProgress`.
4. Repoint imports in cards routes, progress/stats route, and the DTO module.
5. Move the test file; update assertions/table names.
6. `rg` for `cardReview|card_reviews|card-review-queries` — repoint stragglers.
7. Run full verification, including the progress/stats path.

## Success Criteria
- [ ] No `CardReview` / `card_reviews` / `card-review-queries` references remain (`rg` clean).
- [ ] Rename migration preserves existing rows (verified locally).
- [ ] `api/progress/stats` returns unchanged shape/values.
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` pass.

## Risk Assessment
- Migration: must RENAME, not drop — a drop/recreate would lose review history. Review the
  generated SQL before applying; Prisma may emit drop+create for renames.
- Constraint/index names: rename explicitly so future migrations stay deterministic.
- Keep the client DTO field names stable to avoid breaking `/api/cards/*` consumers.
