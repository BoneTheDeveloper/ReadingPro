# Phase 06 — Tests + Docs + ADR

## Overview

- Priority: P0 (gate)
- Status: Completed
- Depends on: Phases 01–05
- Make all suites green, add coverage for `QuizResult`, and document the consolidated
  model (including an ADR recording the role-per-table decision).

## Requirements

- `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` all green — real assertions,
  no skips/mocks-to-pass.
- New tests: `recordQuizResult` / `resetQuizResult` (service: accuracy rounding,
  ownership scoping, upsert overwrite, reset delete) + the two server actions.
- Removed/obsolete tests deleted or rewritten.

## Related Code Files

Tests — modify/remove:
- Delete `tests/vitest/integration/api/quiz-attempt-route.test.ts`.
- Delete cards-route tests (if any) + `quiz-review.test.ts` cases for removed fns.
- `tests/vitest/integration/api/routes.test.ts` — drop quiz-attempt + cards cases and
  the dead stat fields in the progress fixture.
- `tests/vitest/integration/services/passage-study-service.test.ts` — drop quiz-attempt
  expectations if present.
- `tests/vitest/integration/components/study/study-page-client.integration.test.tsx` —
  remove quiz-attempt mock; assert result-on-artifact + Retry.
- `src/lib/spaced-repetition/scheduler.test.ts` — drop SM-2/helper tests.
- `tests/vitest/mocks/db.ts` — drop `quizAttempt` + `questionReview`; add `quizResult`.

Tests — add:
- `src/lib/study/passage/studio-artifacts-service.test.ts` — `recordQuizResult` +
  `resetQuizResult` coverage.

Docs — modify/remove:
- Delete `docs/API/Routes/quiz-attempt-feature.md`.
- Remove cards routes from `docs/API/api-index.md`; remove the stale `study-results` row.
- `docs/API/Routes/studio-artifacts-feature.md` — document the quiz attempt/result
  lifecycle (not-attempted → finished, Retry) + the `QuizResult` 1:1 child.
- `docs/API/Routes/progress-feature.md` — reflect streak/time-only stats.
- `docs/Database/data-dictionary.md`, `docs/Database/erd.md` — drop `quiz_attempts` +
  `question_reviews`; add `quiz_results`.
- `docs/codebase-summary.md`, `docs/project-changelog.md` — record the cleanup.
- New ADR `docs/ADR/0006-learning-domain-model.md` — the role-per-table model, why
  QuizAttempt→QuizResult, why the SM-2/cards subsystem was removed, and the
  single-engine (vocab `simpleSchedule`) decision. Reference/relate ADR 0005.

## Implementation Steps

1. Delete/rewrite obsolete tests; add `QuizResult` tests.
2. Full `typecheck` + `lint` + `test`; fix to green.
3. Write ADR 0006; update affected docs; verify no dangling links to removed
   routes/docs (`/api/cards`, `/api/quiz-attempt`, quiz-attempt-feature.md).

## Todo

- [ ] Obsolete tests removed/rewritten
- [ ] `QuizResult` service/action tests added
- [ ] Full suite green
- [ ] ADR 0006 written
- [ ] Docs updated; no stale links

## Success Criteria

- Suite passes with real assertions.
- No references to `QuizAttempt`, `QuestionReview`, `/api/cards`, `/api/quiz-attempt`,
  or `sm2` in code or docs.
- ADR 0006 captures the consolidated model and supersedes the confusing prior state.
