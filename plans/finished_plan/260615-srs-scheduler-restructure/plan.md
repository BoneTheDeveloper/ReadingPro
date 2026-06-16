---
title: "Plan B — SRS scheduler restructure"
description: "Promote SM-2 into a single content-agnostic srs/scheduler.ts (sm2() + simpleSchedule() — the only home of SRS logic). Rename CardReview→QuestionReview (question_reviews), bound to Question via quiz/quiz-review.ts. Vocabulary rebinds its scheduling to simpleSchedule(). Dictionary stays read-only reference."
status: completed
priority: P2
branch: "feature/issue-69-study-quiz-flow"
tags: [refactor, srs, data-model, scheduler]
blockedBy: [project:260615-studysession-quiz-session-role]
blocks: []
created: "2026-06-15"
revised: "2026-06-15"
createdBy: "brainstorm"
source: skill
---

# Plan B — SRS scheduler restructure (D2)

> Resolves decision **D2** from the StudySession brainstorm: instead of deleting the
> orphaned SRS subsystem, consolidate scheduling into one shared module and rebind both
> consumers (questions, vocabulary) to it. Cleanup of the session↔SRS glue lands first
> in **Plan A** (`computeSessionAccuracy` removed there).

## Decision (resolved)

- **One home for SRS:** a content-agnostic `srs/scheduler.ts` exposing:
  - `sm2()` — the SM-2 algorithm (promoted from `src/lib/algorithms/sm2.ts`).
  - `simpleSchedule()` — a simple interval schedule for lightweight review.
  These are the *only* place "SRS" logic lives.
- **CardReview → QuestionReview** (`card_reviews` → `question_reviews`), still bound to
  `Question`, with its query layer moved to `quiz/quiz-review.ts`. Uses `sm2()`.
- **Vocabulary rebinds to `simpleSchedule()`** for its `nextReviewAt`/`status` updates
  (per ADR 0005 vocabulary-review-mvp-path). `VocabularyItem` row shape unchanged.
- **Dictionary stays a read-only reference** — never scheduled, untouched.

## Current state (verified)

- SM-2 lives in `src/lib/srs/scheduler.ts` (promoted).
- `QuestionReview` renamed and moved to `quiz/quiz-review.ts`.
- Vocabulary scheduling rebound to `simpleSchedule()` via `reviewVocabularyItem`.

## Target shape

```
src/lib/srs/scheduler.ts          # ONLY home of SRS logic
  sm2(state, quality) -> {easeFactor, intervalDays, repetitions, nextReviewDate}
  simpleSchedule(state, outcome) -> {intervalDays, nextReviewDate, status?}
  + helpers: isDue(), statusFor()

src/lib/db/quiz/quiz-review.ts     # renamed from card-review-queries.ts
  QuestionReview CRUD + getDueQuestions + getUserProgress (reads question_reviews)
  uses sm2()

prisma: model QuestionReview @@map("question_reviews")   (was CardReview/card_reviews)

vocabulary-queries.ts -> uses simpleSchedule() to set nextReviewAt/status
dictionary -> read-only, untouched
```

## Phases

| Phase | Name | Migration | Depends on | Status |
|-------|------|-----------|-----------|--------|
| 1 | Create `srs/scheduler.ts` (promote `sm2()`, add `simpleSchedule()`); repoint imports | none | Plan A | Completed |
| 2 | Rename `CardReview`→`QuestionReview` / `card_reviews`→`question_reviews`; move queries to `quiz/quiz-review.ts`; update routes, DTO, `getUserProgress`, tests | rename table/model | Phase 1 | Completed |
| 3 | Rebind vocabulary scheduling to `simpleSchedule()` | none | Phase 1 | Completed |

## Verification commands

```bash
pnpm run typecheck
pnpm run lint
pnpm exec vitest src/lib/algorithms/sm2.test.ts --config tests/vitest/vitest.config.ts
pnpm run test
```

## Notes
- Phase 3 is independent of Phase 2 (both depend only on Phase 1) and may ship separately.
- Keep `Question` ↔ `QuestionReview` relation and the `@@unique([questionId, userId])`
  semantics; this is a rename, not a redesign of the review-history model.
- UI wiring for question review (currently no caller) is out of scope — this plan makes
  the subsystem coherent and consistently named, ready to wire later.
