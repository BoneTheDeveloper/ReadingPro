# ADR 0006: Learning Domain Model Consolidation

**Date**: 2026-06-16  
**Status**: Accepted

## Context

The learning domain had accrued multiple overlapping models over time, creating confusion about the role of each table and adding unnecessary complexity to queries and UI logic:
- `QuizAttempt`: Tracked quiz results but was a child of `StudySession` instead of the quiz artifact itself. This created indirection and made it hard to show a score on the artifact UI.
- `QuestionReview`: Tracked SM-2 spaced repetition state per-question. However, high-stakes question-level SRS was never wired into the UI or fully implemented, leaving the `/api/cards` subsystem dead code.
- Vocabulary SRS: As per ADR 0005, we chose a simple `LEARNING -> MASTERED` path for vocabulary instead of full SM-2.

This confusion led to scattered queries, unused data aggregation in the progress dashboard, and UI limitations (like being unable to properly retry a quiz or see its score easily).

## Decision

We have consolidated the learning domain to enforce a strict **role-per-table** model:

1. **`QuizResult` replaces `QuizAttempt`**:
   - `QuizAttempt` is removed.
   - `QuizResult` is introduced as a 1:1 child of `StudioArtifact`.
   - A quiz run is now explicitly coupled to the artifact that generated the questions. This allows the studio panel to easily derive the attempt state (not attempted, finished with score) directly from the artifact.
   - We allow retries by simply deleting the `QuizResult` row and letting the user take the quiz again, overwriting the score.
2. **Remove Dead SM-2/Cards Subsystem**:
   - `QuestionReview` is removed.
   - The `/api/cards` routes and `sm2` algorithm helpers are deleted.
   - The `simpleSchedule` used by vocabulary remains as the single engine for spaced repetition, aligning with ADR 0005.
3. **Trim Progress Dashboard**:
   - The progress dashboard is simplified to show only streak and study time (driven by `StudySession`).
   - We removed the dead aggregations for cards and quizzes.

## Consequences

- **Positive**:
  - The mental model for developers is much simpler: artifacts own their results, sessions track time/presence, and vocabulary handles its own lightweight SRS.
  - Queries are significantly faster and simpler.
  - The UI for quizzes is more robust, supporting clear completion states and retries.
  - Reduced codebase size by removing dead API routes and test suites.
- **Negative**:
  - We discard historical data in `quiz_attempts` and `question_reviews`. This is acceptable because the app is pre-release and the cards subsystem was unused.
  - If we ever want high-stakes question-level spaced repetition in the future, we will have to rebuild it.

## Related ADRs

- Re-affirms and builds upon **ADR 0005: Vocabulary Review MVP Path** by cementing `simpleSchedule` as the sole repetition engine.
