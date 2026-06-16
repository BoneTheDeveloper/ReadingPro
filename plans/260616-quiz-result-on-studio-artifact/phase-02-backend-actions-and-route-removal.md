# Phase 02 — Backend: Record/Reset Actions + Remove quiz-attempt Route

## Overview

- Priority: P0
- Status: Not started
- Depends on: Phase 01
- Add result persistence to the studio-artifacts service + two server actions; delete
  the `/api/quiz-attempt` route, its queries, client, and DTOs.

## Requirements

- `StudioArtifact` type/DTO carries the 4 result fields (nullable).
- `studio-artifacts-service.ts`:
  - `toStudioArtifact` maps the new fields.
  - `recordQuizResult(artifactId, userId, { correctCount, totalQuestions })`
    computes `accuracyRate`, sets `attemptCompletedAt = now`, ownership-scoped
    `updateMany` (`where id+userId`).
  - `resetQuizResult(artifactId, userId)` clears the 4 fields (Retry).
- `studio-artifact-actions.ts`:
  - `studioRecordQuizResultAction({ artifactId, correctCount, totalQuestions })`
  - `studioResetQuizResultAction({ artifactId })`
  - Both wrapped in `Sentry.withServerActionInstrumentation`, auth via
    `getAuthenticatedUser`, matching existing action style.
- Validation: `correctCount >= 0`, `totalQuestions > 0`, `correctCount <= totalQuestions`.

## Related Code Files

Modify:
- `src/lib/study/shared/studio-artifact-types.ts` — add result fields to `StudioArtifact`.
- `src/features/study/model/types.ts` — if it re-exports/extends the type.
- `src/lib/study/passage/studio-artifacts-service.ts` — mapper + `recordQuizResult` +
  `resetQuizResult`.
- `src/features/study/actions/studio-artifact-actions.ts` — two new actions.
- `src/features/study/api/api-utils.ts` — remove `quizAttempt` route entry.
- `src/lib/study/shared/study-response-schema.ts` — remove `quizAttemptSchema`,
  `quizAttemptResponseSchema`, `toQuizAttemptDto`, `RawQuizAttempt`,
  `QuizAttemptDto`. Keep all `studySession` symbols.

Delete:
- `src/app/api/quiz-attempt/route.ts`
- `src/lib/db/quiz-attempt-queries.ts`
- `src/features/study/api/quiz-attempt-client.ts`

Note: `src/features/study/api/study-session-client.ts` + heartbeat stay (session time
tracking). Only the quiz path stops calling it.

## Implementation Steps

1. Extend `StudioArtifact` type with the 4 fields.
2. Update `toStudioArtifact` mapper.
3. Add `recordQuizResult` / `resetQuizResult` to the service.
4. Add the two server actions.
5. Remove `quizAttempt` from `api-utils.ts` and the quiz-attempt DTO/schema exports.
6. Delete the route, queries, and client files.
7. `pnpm run typecheck`.

## Todo

- [ ] Type + DTO updated
- [ ] Service record/reset implemented
- [ ] Server actions added
- [ ] quiz-attempt route/queries/client deleted
- [ ] schema/api-utils cleaned
- [ ] Typecheck green

## Success Criteria

- No remaining import of `quiz-attempt-client` / `quiz-attempt-queries` / `/api/quiz-attempt`.
- Actions persist + reset result with ownership scoping.

## Security Considerations

- Both actions ownership-scoped by `userId`; `updateMany` `where { id, userId }`.
- Reuse `accuracyRate` rounding logic from the old `completeQuizAttempt`.
