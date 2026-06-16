---
title: "Plan A — StudySession cleanup: remove dead quiz dual-write & dead columns"
description: "Decision-independent cleanup. Delete the dead studySession quiz dual-write and drop the orphaned StudySession columns + dead SRS glue (computeSessionAccuracy, updateStudySession, PATCH route). Ships now. SRS restructure and the multi-attempt session model are split into Plans B and C."
status: completed
priority: P2
branch: "feature/issue-69-study-quiz-flow"
tags: [refactor, data-model, cleanup, session]
blockedBy: []
blocks: [project:260615-srs-scheduler-restructure, project:260615-multi-activity-session-model]
created: "2026-06-15"
revised: "2026-06-15"
createdBy: "brainstorm"
source: skill
---

# Plan A — StudySession cleanup

> Split 2026-06-15 from the larger "StudySession role" brainstorm. The two open
> decisions that widened the original plan are now their own plans:
> - **D2 (SRS restructure)** → `plans/260615-srs-scheduler-restructure/` (Plan B)
> - **D1 (multi-attempt session model)** → `plans/260615-multi-activity-session-model/` (Plan C)
>
> This plan keeps only the parts that are **decision-independent and ship now**.

## Scope

Remove dead writes and dead columns/glue on `StudySession`. No behavior change for
any live reader: `progress/stats` reads `quiz_attempts` (+ `card_reviews`) directly,
never the StudySession quiz/SRS columns.

## Findings (verified)

`StudySession` wears three hats; two are dead:

| Role | Writer | Reader | Status |
|------|--------|--------|--------|
| (a) Parent grouping of `QuizAttempt` (1:N) | quiz POST | FK join only | Live (1:1 today) |
| (b) Mirror of quiz scores (`correctCount/incorrectCount/accuracyRate/completedAt`) | `completeQuizAttempt` dual-write (`quiz-attempt-queries.ts:91-100`) | **nobody** | Dead |
| (c) SRS session summary (`cardsReviewed/newCards` + computed accuracy) | `PATCH /api/study-session` → `updateStudySession` | **nobody** | Dead |

- `completeQuizAttempt` writes the same scores to both `quiz_attempts` and
  `study_sessions` in one transaction; nothing reads the StudySession copy.
- `computeSessionAccuracy` (`study-session-queries.ts:34-60`) correlates `card_reviews`
  to a session by `reviewedAt >= startedAt` — a fragile heuristic; its only caller is
  `updateStudySession`, whose only caller is the PATCH route, which no UI calls.

## Target shape (after Plan A)

```
StudySession  (the sitting: WHO, WHEN, lifecycle)
  id, userId, startedAt, completedAt?
  quizAttempts: QuizAttempt[]      (1:N, FK only)

  DROP columns: correctCount, incorrectCount, accuracyRate,
                cardsReviewed, newCards, passageId
  DROP code:    computeSessionAccuracy, updateStudySession,
                PATCH /api/study-session route, the SRS/score PATCH schemas

QuizAttempt    — unchanged; source of truth for quiz scores (has its own passageId)
```

`completedAt` stays (lifecycle column) but is no longer written by quiz completion;
Plan C wires session lifecycle (presence-window close).

## Phases

| Phase | Name | Migration | Status |
|-------|------|-----------|--------|
| 1 | Remove quiz dual-write (delete the `studySession.update` half of `completeQuizAttempt`) | none | Pending |
| 2 | Drop dead StudySession columns + `passageId`; remove `PATCH /api/study-session`, `updateStudySession`, `computeSessionAccuracy` + schemas | drop columns (no backfill) | Pending |

Phases 1 and 2 ship in **one PR**. Phase 1 has no migration (safe to bundle); Phase 2
drops columns with no backfill needed because no live reader depends on them.

## Cross-plan ordering

Plan A ships first. It removes `computeSessionAccuracy` (the only `card_reviews`↔session
glue) and the `passageId` column, shrinking the surface for both follow-ups:
- **Plan B** renames `CardReview`→`QuestionReview`; easier once the session glue is gone.
- **Plan C** rebuilds session lifecycle on the cleaned-up StudySession shape.

## Verification commands

```bash
pnpm run typecheck
pnpm run lint
pnpm exec vitest tests/vitest/integration/api/quiz-attempt-route.test.ts --config tests/vitest/vitest.config.ts
pnpm run test
```

## Notes

- The quiz route test mocks the query layer, so no test asserts the dual-write;
  removing it does not break existing quiz tests.
- `tests/vitest/integration/api/study-session-route.test.ts` and
  `src/lib/db/study-session-queries.test.ts` exercise the PATCH path and
  `updateStudySession`/`computeSessionAccuracy`; both need updating in Phase 2.
- Related in-flight plan: `plans/260615-issue-69-study-quiz-flow/` (quiz-attempt API
  hardening) — a sibling, not a dependency.

## Validation Log

*Validated 2026-06-15 — Light verification tier (2 phases).*

### Verification Results
- Claims checked: 10
- Verified: 10 | Failed: 0 | Unverified: 0
- Notable: `toStudySessionDto` + Zod `studySessionSchema` in `study-response-schema.ts`
  serialize the dead columns into the `/api/study-session` response. No end consumer
  reads those fields, but Phase 2 must trim **both** the mapper and the schema.
- `Passage.studySessions` back-relation confirmed at `schema.prisma:62` — must be
  removed alongside `passageId`.
- Confirmed no client PATCH caller exists.
- Both affected test files confirmed present.

### Decisions
| # | Question | Decision |
|---|----------|----------|
| 1 | API response contract for dead fields | Remove fully — trim `toStudySessionDto` AND `studySessionSchema` to `{id,userId,startedAt,completedAt}`. Safe: only client reads `data.id`. |
| 2 | PR/migration split | One PR — bundle Phase 1 (code-only) + Phase 2 (column-drop migration) together. |

### Whole-Plan Consistency Sweep
Phase 2 updated to explicitly list trimming the Zod `studySessionSchema` alongside
`toStudySessionDto`. No other contradictions found across `plan.md` and phase files.
