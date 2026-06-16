# Phase 03 — QuizResult Backend + Drop quiz-attempt

## Overview

- Priority: P0
- Status: Completed
- Depends on: Phase 01
- Persist/clear the quiz result on the artifact's `QuizResult` child via server
  actions; remove the `/api/quiz-attempt` route, queries, client, and DTOs.

## Requirements

- `StudioArtifact` type/DTO exposes an optional `quizResult`
  (`{ completedAt, correctCount, totalQuestions, accuracyRate }`).
- Service (`studio-artifacts-service.ts`):
  - `fetchStudioArtifacts` includes the `quizResult` relation in its select/map.
  - `recordQuizResult(artifactId, userId, { correctCount, totalQuestions })` — computes
    `accuracyRate`, upserts the `QuizResult` row, ownership-scoped via the artifact.
  - `resetQuizResult(artifactId, userId)` — deletes the `QuizResult` row (Retry).
- Server actions (`studio-artifact-actions.ts`):
  - `studioRecordQuizResultAction({ artifactId, correctCount, totalQuestions })`
  - `studioResetQuizResultAction({ artifactId })`
- Validation: `correctCount >= 0`, `totalQuestions > 0`, `correctCount <= totalQuestions`.
- Retry semantics: upsert (a re-finish overwrites the single `QuizResult`).

## Related Code Files

Modify:
- `src/lib/study/shared/studio-artifact-types.ts` — add `quizResult` to `StudioArtifact`.
- `src/features/study/model/types.ts` — surface result to UI.
- `src/lib/study/passage/studio-artifacts-service.ts` — relation in fetch + record/reset.
- `src/features/study/actions/studio-artifact-actions.ts` — two actions.
- `src/features/study/api/api-utils.ts` — remove `quizAttempt` route entry.
- `src/lib/study/shared/study-response-schema.ts` — remove `quizAttempt*` schemas/DTOs;
  keep `studySession*`.

Delete:
- `src/app/api/quiz-attempt/route.ts`
- `src/lib/db/quiz-attempt-queries.ts`
- `src/features/study/api/quiz-attempt-client.ts`

Keep: `study-session-client.ts` + heartbeat (session time tracking) — the quiz path
just stops calling them.

## Implementation Steps

1. Extend artifact type/DTO with `quizResult`.
2. Include relation in `fetchStudioArtifacts`; map it.
3. Implement `recordQuizResult` (upsert) + `resetQuizResult` (delete).
4. Add the two server actions (auth + ownership via artifact).
5. Remove `quizAttempt` route entry + quiz-attempt DTOs/schemas.
6. Delete route, queries, client.
7. `pnpm run typecheck`.

## Todo

- [ ] Artifact type/DTO + fetch relation
- [ ] record/reset service fns (upsert/delete)
- [ ] two server actions
- [ ] quiz-attempt route/queries/client deleted
- [ ] schema/api-utils cleaned
- [ ] Typecheck green

## Success Criteria

- No reference to `QuizAttempt`, `quiz-attempt-client`, `quiz-attempt-queries`, or
  `/api/quiz-attempt`.
- Finishing/Retrying a quiz writes/clears the `QuizResult` row, ownership-scoped.

## Security Considerations

- Ownership enforced through the parent artifact (`where artifact.userId == user`).
- Reuse accuracy rounding from the old `completeQuizAttempt`.
