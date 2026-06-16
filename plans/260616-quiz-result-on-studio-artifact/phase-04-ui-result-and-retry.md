# Phase 04 — UI: Result Display + Retry, Rewire Quiz Flow

## Overview

- Priority: P0
- Status: Not started
- Depends on: Phase 01, 02
- Show attempt state + score on the quiz artifact in the studio panel, add Retry, and
  rewire the quiz UI to record results via the new server action instead of the
  quiz-attempt route.

## Requirements

- Quiz artifact row in the studio panel shows:
  - Not finished (`attemptCompletedAt == null`): current behavior (open to take).
  - Finished: score summary (e.g. `8/10 · 80%`) + a **Retry** button.
- `quiz-content.tsx`: remove the mid-quiz `createQuizAttemptForArtifact` call and its
  session/attempt state; keep `artifactId` flowing to results.
- `quiz-results.tsx`: on finish, call `studioRecordQuizResultAction({ artifactId,
  correctCount, totalQuestions })` (replaces `completeQuizAttempt`). Keep the
  idempotent-guard + error/retry-inline behavior.
- Retry: calls `studioResetQuizResultAction({ artifactId })`, then re-enters the quiz
  (reuse existing `resetTest` flow) and updates cached artifact result to null.

## Related Code Files

Modify:
- `src/features/study/ui/studio/studio-panel.tsx` — render finished score + Retry;
  derive attempt state from `attemptCompletedAt`.
- `src/features/study/ui/studio/quiz/quiz-content.tsx` — drop attempt-create wiring.
- `src/features/study/ui/studio/quiz/quiz-results.tsx` — record via server action.
- `src/features/study/hooks/use-study-actions.ts` — add handlers to record/reset and
  patch the cached artifact result (mirror existing `updateArtifactStatus`).
- `src/features/study/model/types.ts` — artifact result fields available to UI.

## Implementation Steps

1. Surface result fields on the cached artifact (from Phase 02 type changes).
2. Studio panel: finished-state rendering + Retry button.
3. quiz-content: remove `createQuizAttemptForArtifact` usage + related state.
4. quiz-results: swap `completeQuizAttempt` → `studioRecordQuizResultAction`.
5. Wire Retry → `studioResetQuizResultAction` + local cache reset + re-take.
6. `pnpm run typecheck` + `pnpm run lint`.

## Todo

- [ ] Artifact result surfaced in state/types
- [ ] Studio panel finished score + Retry
- [ ] quiz-content attempt wiring removed
- [ ] quiz-results records via action
- [ ] Retry reset wired
- [ ] Typecheck + lint green

## Success Criteria

- Finishing a quiz persists the score on the artifact and shows it in the panel.
- Retry clears the result and lets the user re-take; new score overwrites.
- No remaining reference to quiz-attempt client/route in UI.

## UX Notes

- Keep the existing inline error + retry affordance from `quiz-results.tsx` for the
  record call.
- Generation status (spinner/failed) and attempt status are independent indicators.
