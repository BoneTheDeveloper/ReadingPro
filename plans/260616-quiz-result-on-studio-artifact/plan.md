# Quiz Result on Studio Artifact

Replace the standalone `QuizAttempt` model with quiz-result fields stored directly
on the `StudioArtifact` that produced the quiz. A quiz artifact then represents its
own attempt state (not attempted / finished), holds its score, and supports Retry.
No per-answer storage. The progress dashboard's quiz stats are dropped (not
re-pointed) per product decision.

## Why

- `QuizAttempt` is the only score ledger today, but it has no link to the artifact
  it scored, its `studySessionId`/`passageId` FKs are write-only, and the
  start/complete (POST+PATCH) lifecycle forces a 3-call client dance for one result.
- Product direction: the result belongs on the "question studio artifact" the user
  already sees; retries overwrite; individual answers don't matter.

See analysis context in this conversation; key models/routes/UI mapped in
`docs/API/Routes/studio-artifacts-feature.md` and `docs/API/Routes/quiz-attempt-feature.md`.

## Scope decisions (confirmed)

- Drop `QuizAttempt` model + `quiz_attempts` table (pre-release; existing rows lost).
- Store result on `StudioArtifact`: `attemptCompletedAt`, `correctCount`,
  `totalQuestions`, `accuracyRate`.
- Generation `status` (generating/done/failed) is unchanged; attempt state is
  derived from `attemptCompletedAt`.
- Record/reset via server actions (matches existing `studio*ArtifactAction`); no new
  REST route. Remove `/api/quiz-attempt` entirely.
- `StudySession` stays (time/presence only); it no longer parents attempts.
- Progress dashboard: remove the 3 quiz cards and the quiz aggregation in
  `getUserProgress`.

## Phases

| # | Phase | Status |
|---|-------|--------|
| 01 | [Schema + migration](phase-01-schema-and-migration.md) | Not started |
| 02 | [Backend: actions + remove quiz-attempt route](phase-02-backend-actions-and-route-removal.md) | Not started |
| 03 | [Drop progress quiz stats](phase-03-drop-progress-quiz-stats.md) | Not started |
| 04 | [UI: result display + Retry, rewire quiz flow](phase-04-ui-result-and-retry.md) | Not started |
| 05 | [Tests + docs](phase-05-tests-and-docs.md) | Not started |

## Dependencies

- 02 depends on 01 (schema/types).
- 03 independent of 02 but both before 04 wiring is verified.
- 04 depends on 01 + 02.
- 05 last (verifies all).

## Out of scope

- Multi-attempt history / retake analytics.
- Re-pointing progress stats to `StudioArtifact` (explicitly dropped).
- Flashcard artifact results (only `type='quiz'`).
