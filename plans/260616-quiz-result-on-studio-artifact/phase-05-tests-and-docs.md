# Phase 05 — Tests + Docs

## Overview

- Priority: P0 (gate)
- Status: Not started
- Depends on: Phases 01–04
- Update/remove tests touching `QuizAttempt`, add coverage for the new result
  actions/service, and sync docs.

## Requirements

- All suites green: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test`.
- New tests cover `recordQuizResult` / `resetQuizResult` (service) and the two server
  actions (accuracy calc, ownership scoping, reset clears fields).
- Removed/obsolete tests deleted or rewritten — no skipped/fake passing.

## Related Code Files

Tests — modify/remove:
- `tests/vitest/integration/api/quiz-attempt-route.test.ts` — delete (route gone).
- `tests/vitest/integration/api/routes.test.ts` — drop quiz-attempt cases + quiz stat
  fields in the progress fixture.
- `tests/vitest/integration/services/passage-study-service.test.ts` — drop quiz-attempt
  service expectations if present.
- `tests/vitest/integration/components/study/study-page-client.integration.test.tsx` —
  remove quiz-attempt fetch mock; assert result-on-artifact + Retry flow.
- `tests/vitest/mocks/db.ts` — remove `quizAttempt` model mock; ensure `studioArtifact`
  mock covers new fields.
- `src/lib/db/quiz/quiz-review.test.ts` — covered in Phase 03.

Tests — add:
- `src/lib/study/passage/studio-artifacts-service.test.ts` — extend with
  `recordQuizResult` (accuracy rounding, ownership scope) + `resetQuizResult`.
- Action tests for `studioRecordQuizResultAction` / `studioResetQuizResultAction`
  (if action-level tests exist in the repo pattern).

Docs — modify/remove:
- `docs/API/Routes/quiz-attempt-feature.md` — delete.
- `docs/API/Routes/studio-artifacts-feature.md` — add the attempt/result lifecycle
  (not-attempted → finished, Retry) and the result fields.
- `docs/API/api-index.md` — remove the `quiz-attempt` row; also remove the stale
  `study-results` row (no such route).
- `docs/API/Routes/progress-feature.md` — drop quiz stat fields.
- `docs/codebase-summary.md`, `docs/project-changelog.md` — record the change.
- `docs/Database/data-dictionary.md`, `docs/Database/erd.md` — drop `quiz_attempts`,
  add `studio_artifacts` result columns.

## Implementation Steps

1. Delete/rewrite obsolete tests.
2. Add service/action tests for record + reset.
3. Run full `typecheck` + `lint` + `test`; fix until green.
4. Update docs; verify no dangling links to removed routes/docs.

## Todo

- [ ] Obsolete quiz-attempt tests removed/rewritten
- [ ] record/reset tests added
- [ ] Full suite green
- [ ] Docs updated (quiz-attempt deleted, studio-artifacts + db docs updated)
- [ ] No stale doc links

## Success Criteria

- Full test suite passes with real assertions (no skips/mocks-to-pass).
- Docs match the implemented behavior; no references to `/api/quiz-attempt` or
  `QuizAttempt` remain in code or docs.
