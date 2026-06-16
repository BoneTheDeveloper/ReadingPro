# Phase 05 — Quiz UI: Result + Retry

## Overview

- Priority: P0
- Status: Not started
- Depends on: Phase 01, 03
- Show attempt state + score on the quiz artifact in the studio panel, add Retry, and
  rewire the quiz UI to the `QuizResult` server actions.

## Requirements

- Studio panel quiz artifact row:
  - No `quizResult` → current "open to take" behavior.
  - Has `quizResult` → score summary (e.g. `8/10 · 80%`) + a **Retry** button.
- `quiz-content.tsx`: remove the mid-quiz `createQuizAttemptForArtifact` call + its
  session/attempt state; keep `artifactId` flowing to results.
- `quiz-results.tsx`: on finish call `studioRecordQuizResultAction({ artifactId,
  correctCount, totalQuestions })` (replaces `completeQuizAttempt`); keep the
  idempotent guard + inline error/retry affordance.
- Retry → `studioResetQuizResultAction({ artifactId })`, reset local quiz state, clear
  the cached artifact's `quizResult`.

## Related Code Files

Modify:
- `src/features/study/ui/studio/studio-panel.tsx` — finished score + Retry; derive
  attempt state from `quizResult`.
- `src/features/study/ui/studio/quiz/quiz-content.tsx` — drop attempt-create wiring.
- `src/features/study/ui/studio/quiz/quiz-results.tsx` — record via server action.
- `src/features/study/hooks/use-study-actions.ts` — handlers to record/reset + patch the
  cached artifact `quizResult` (mirror existing `updateArtifactStatus`).
- `src/features/study/model/types.ts` — `quizResult` on the cached artifact.

## Implementation Steps

1. Surface `quizResult` on the cached artifact (Phase 03 types).
2. Studio panel: finished-state rendering + Retry.
3. quiz-content: remove `createQuizAttemptForArtifact`.
4. quiz-results: swap to `studioRecordQuizResultAction`.
5. Wire Retry → `studioResetQuizResultAction` + local reset.
6. `pnpm run typecheck` + `pnpm run lint`.

## Todo

- [ ] `quizResult` surfaced in state/types
- [ ] Studio panel score + Retry
- [ ] quiz-content attempt wiring removed
- [ ] quiz-results records via action
- [ ] Retry wired
- [ ] Typecheck + lint green

## Success Criteria

- Finishing a quiz persists the score on the artifact and shows it in the panel.
- Retry clears the result and lets the user re-take; new score overwrites.
- No remaining reference to quiz-attempt client/route in UI.

## UX Notes

- Keep the existing inline error + retry affordance for the record call.
- Generation status (spinner/failed) and attempt status (score/Retry) are independent
  indicators on the artifact row.
