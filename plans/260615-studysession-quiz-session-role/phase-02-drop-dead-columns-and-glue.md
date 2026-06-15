---
phase: 2
title: "Drop dead StudySession columns + SRS glue"
status: pending
priority: P2
effort: "3h"
dependencies: [1]
---

# Phase 2: Drop dead StudySession columns + SRS glue

## Overview
Drop the dead StudySession columns (`correctCount`, `incorrectCount`, `accuracyRate`,
`cardsReviewed`, `newCards`, `passageId`) and remove the dead glue that wrote/derived
them: `updateStudySession`, `computeSessionAccuracy`, the `PATCH /api/study-session`
route, and the score/SRS PATCH schemas.

## Requirements
- Functional: `POST /api/study-session` still creates a session (now WHO/WHEN only).
  The PATCH route is removed (returns 405/404 by route deletion). No live reader breaks.
- Non-functional: migration drops columns with no backfill (no live data dependency).

## Architecture
Keep on `StudySession`: `id, userId, startedAt, completedAt`, `quizAttempts` relation,
`@@index([userId, startedAt])`. Remove everything else listed above. `createStudySession`
loses its `passageId` argument/validation; passage ownership lives on `QuizAttempt`.

`computeSessionAccuracy` is the only code correlating `card_reviews` to a session;
removing it cleanly decouples StudySession from the SRS subsystem before Plan B
renames `CardReview`.

## Related Code Files
- Modify: `prisma/schema.prisma` — `StudySession` model: drop `correctCount`,
  `incorrectCount`, `accuracyRate`, `cardsReviewed`, `newCards`, `passageId`, and the
  `passage` relation; remove now-unused back-relation on `Passage` if present.
- Create: `prisma/migrations/<ts>_drop_dead_studysession_columns/migration.sql`
  (drop the six columns + FK).
- Modify: `src/lib/db/study-session-queries.ts` — delete `computeSessionAccuracy`,
  `updateStudySession`, `updateStudySessionSchema`; drop `passageId` from
  `createStudySession`/`createStudySessionSchema`.
- Modify: `src/app/api/study-session/route.ts` — delete the `PATCH` handler and its
  Zod schema; drop the `passageId` plumbing from `POST` if no longer needed.
- Modify: `src/lib/study/shared/study-response-schema.ts` — trim `toStudySessionDto`
  AND the Zod `studySessionSchema` to `{id, userId, startedAt, completedAt}` only;
  remove `passageId`, `cardsReviewed`, `newCards`, `correctCount`, `incorrectCount`,
  `accuracyRate` from both the schema and the mapper.
- Modify: `src/features/study/api/quiz-attempt-client.ts` — `createQuizAttemptForPassage`
  stops sending `passageId` in the session POST (passage stays on the attempt POST).
- Modify/Delete: `tests/vitest/integration/api/study-session-route.test.ts` (remove
  PATCH cases) and `src/lib/db/study-session-queries.test.ts` (remove
  `updateStudySession`/`computeSessionAccuracy` cases).

## Implementation Steps
1. Edit `schema.prisma`; remove the six columns + `passage` relation from `StudySession`
   (and matching back-relation on `Passage`).
2. Generate migration: `pnpm prisma migrate dev --name drop_dead_studysession_columns`.
3. Delete `computeSessionAccuracy`, `updateStudySession`, `updateStudySessionSchema`;
   simplify `createStudySession`/`createStudySessionSchema` to drop `passageId`.
4. Remove the `PATCH` handler + schema from the study-session route.
5. Trim `toStudySessionDto` AND the Zod `studySessionSchema` to `{id, userId, startedAt,
   completedAt}`. This is a response-shape change; safe because the only client reads
   `data.id` and there is no external API consumer.
6. Update `createQuizAttemptForPassage` to not POST `passageId` to the session endpoint.
7. Update/remove the two affected test files.
8. Run full verification.

## Success Criteria
- [ ] `StudySession` has only `id, userId, startedAt, completedAt, quizAttempts`.
- [ ] No references remain to `updateStudySession`, `computeSessionAccuracy`, or the
      dropped columns (`rg` clean).
- [ ] `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` pass.

## Risk Assessment
- Column drop is irreversible but safe: no live reader. Verify with `rg` that nothing
  outside the listed files reads the dropped columns before migrating.
- `passageId` removal: confirm no reader joins `StudySession.passage`; passage data is
  on `QuizAttempt`.
