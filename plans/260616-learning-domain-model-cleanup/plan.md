# Learning Domain Model Cleanup

Resolve the long-standing confusion across the quiz / review / vocab models so every
table has exactly one role. Removes a dead spaced-repetition subsystem, relocates the
quiz score onto the artifact that produced it, and leaves vocab as the only review
flow.

## Target model — one role per table

| Role | Quiz domain | Vocab domain |
|------|-------------|--------------|
| Source | `Passage` | — |
| Set | `StudioArtifact` (quiz) | `VocabularySet` (+ `VocabularySetItem`) |
| Item | `Question` | `VocabularyItem` (+ `VocabularyOccurrence`) |
| Review/SRS | — (removed) | inline on `VocabularyItem` via `simpleSchedule()` |
| Result | `QuizResult` (1:1 child of `StudioArtifact`) | — |

## Decisions (locked)

1. Schema is multi-file under `prisma/schema/` (done — groundwork).
2. Delete the dead question-SRS system: `QuestionReview`, `/api/cards/due`,
   `/api/cards/review`, the SM-2 query functions, and the `question_reviews`
   aggregation in `getUserProgress`. Verified dead: `createQuestionReview` is never
   called; cards routes have no UI consumer; card stats are always 0.
3. Delete `sm2()` + the already-dead helpers `isDue` / `statusFor` /
   `getSuggestedRating`. `scheduler.ts` keeps only `simpleSchedule()` (vocab).
4. Replace `QuizAttempt` with `QuizResult` (1:1 on `StudioArtifact`, no
   `StudySession` coupling, no per-answer storage). Drop `/api/quiz-attempt`.
5. Progress dashboard shows streak + study time only (drop all card/quiz cards).
6. Vocab models/logic unchanged.

Rationale + full current-state map captured in this conversation and in the new ADR
(Phase 06). `StudySession` stays (time/presence only).

## Phases

| # | Phase | Status |
|---|-------|--------|
| 01 | [Schema + migration](phase-01-schema-and-migration.md) | Completed |
| 02 | [Remove dead question-SRS + SM-2](phase-02-remove-dead-question-srs.md) | Completed |
| 03 | [QuizResult backend + drop quiz-attempt](phase-03-quizresult-backend.md) | Completed |
| 04 | [Progress dashboard trim](phase-04-progress-dashboard-trim.md) | Completed |
| 05 | [Quiz UI: result + Retry](phase-05-quiz-ui-result-retry.md) | Completed |
| 06 | [Tests + docs + ADR](phase-06-tests-docs-adr.md) | Completed |

## Dependencies

- 02 and 03 both depend on 01 (schema).
- 04 depends on 02 + 03 (stat sources gone).
- 05 depends on 01 + 03 (QuizResult actions).
- 06 last (verifies + documents all).

## Out of scope

- Building real flashcard or question spaced-repetition (re-add SM-2 then).
- Re-pointing progress stats to vocab data (explicitly deferred — streak/time only).
- Unifying Set/Item across quiz and vocab into a generic model (YAGNI).
