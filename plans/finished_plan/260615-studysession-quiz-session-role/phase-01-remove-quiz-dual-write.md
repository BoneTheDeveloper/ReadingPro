---
phase: 1
title: "Remove quiz dual-write"
status: completed
priority: P2
effort: "1h"
dependencies: []
---

# Phase 1: Remove quiz dual-write

## Overview
Delete the `studySession.update` half of `completeQuizAttempt` so quiz scores are
written only to `quiz_attempts`. Code-only, zero migration, no live reader affected.

## Requirements
- Functional: completing a quiz attempt updates only the `quiz_attempts` row; the
  `study_sessions` score/`completedAt` columns are no longer touched here.
- Non-functional: keep the operation a single DB round-trip; remove the now-unneeded
  `$transaction` wrapper if only one statement remains.

## Architecture
`completeQuizAttempt` currently runs `db.$transaction([quizAttempt.update, studySession.update])`.
The second statement mirrors scores onto `StudySession`, which nothing reads. Remove
it and unwrap to a plain `db.quizAttempt.update`.

## Related Code Files
- Modify: `src/lib/db/quiz-attempt-queries.ts` (drop the `db.studySession.update(...)`
  block at lines ~91-100; unwrap `$transaction`).

## Implementation Steps
1. In `completeQuizAttempt`, remove the `db.studySession.update({...})` element from
   the `$transaction` array.
2. Replace the `const [completed] = await db.$transaction([...])` with a direct
   `const completed = await db.quizAttempt.update({...})`.
3. Confirm the function still returns the completed attempt.
4. Run typecheck + the quiz-attempt route test.

## Success Criteria
- [ ] `completeQuizAttempt` no longer references `db.studySession`.
- [ ] `pnpm run typecheck` and `pnpm run lint` pass.
- [ ] `quiz-attempt-route.test.ts` passes unchanged (it mocks the query layer).

## Risk Assessment
Negligible. No reader consumes the StudySession score columns. `completedAt` on the
session also stops being set here — intentional; Plan C owns session lifecycle.
