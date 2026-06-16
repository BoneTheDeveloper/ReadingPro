---
phase: 2
title: "Quiz UX completion"
status: mostly-shipped
priority: P1
effort: "5h"
dependencies: []
---

# Phase 2: Quiz UX completion

> ✅ **Mostly shipped — reconciled 2026-06-16 (gkg-verified).** Already in code, do not
> rebuild:
> - Source quote (`sourceText` + `sourceLine`) rendered in feedback — `quiz-content.tsx:207-214`.
> - Attempt-save failure → non-blocking inline banner + Retry, score stays visible,
>   Strict-Mode double-invoke guarded by `isSavingRef` — `quiz-results.tsx:32-96`.
> - `artifactId` threaded through `QuizContent` / `QuizResults`. Persistence is now the
>   server action `studioRecordQuizResultAction` (not `createQuizAttemptForArtifact`).
>
> **Only remaining item: the passage-switch race** — `use-study-actions.ts:99-102` still
> marks a completed generation `failed` when the active passage changed, discarding a
> valid result. Fix: complete it into its originating passage's cache instead (and apply
> the Phase 0 error-code treatment to genuine failures). Ignore the route/`passageId`
> migration notes below — superseded with Phase 1.

## Overview

Close the three real UX gaps issue #69 requires that are NOT yet in code: render the source
quote in the quiz, make persistence failures visible/recoverable instead of silently swallowed,
and fix the passage-switch race so a successfully generated quiz is not thrown away.
Additionally, update the `QuizContent` to use the new `artifactId` instead of `passageId` for tracking quiz attempts.

## Requirements

- Functional:
  - Each question shows its source quote (`sourceText`, `sourceLine`) alongside the explanation.
  - When attempt create or complete fails, learner sees a non-blocking, recoverable message; the
    quiz remains fully usable and the final score still renders.
  - Switching passage mid-generation must not attach a result to the wrong passage AND must not
    silently discard a valid generation (current code marks it `error`).
  - `QuizContent` uses `artifactId` to create attempts via `createQuizAttemptForArtifact(artifactId)`.
- Non-functional: keep existing keyboard flow and per-passage caching intact; no regressions to
  generation states already working in `studio-panel.tsx`.

## Key Insights

- `QuestionData` already carries `sourceText` + `sourceLine` (`model/types.ts:52-53`) but
  `quiz-content.tsx` renders only `explanation` (`:194-201`). Pure presentation gap.
- Failures are swallowed today: `quiz-content.tsx:55` (`catch { setSessionId(null) }`) and
  `quiz-results.tsx:36` (`.catch(() => {})`). Issue #69 mandates visibility — the note left this
  as an open question; the issue resolves it (must be visible).
- Passage-switch race: `use-study-actions.ts:93-95` marks a completed generation as `error` if
  `activePassageIdRef.current !== passageId`. Results are already keyed by `passageId` in
  `resultsByPassageId` + `resultDetailById`, so attaching to the wrong passage is not actually
  possible — the guard's only effect is to DISCARD a valid result. The fix is to complete it into
  its originating passage's cache regardless of the active passage, so it is there when the user
  switches back ("keep generated quiz result available").

## Architecture

<!-- Updated: Validation Session 1 — confirmed: inline banner + Retry for failures; keep race result on its passage -->

- Source quote: presentation-only addition inside the per-option / per-question feedback block in
  `quiz-content.tsx`. Show after `showFeedback`, near the explanation; include `sourceLine`.
- Persistence visibility: add local error state to `quiz-content.tsx` (attempt-create failure) and
  `quiz-results.tsx` (attempt-complete failure). Render a small inline banner with a retry action.
  Failure must never block answering or hide the score (graceful degradation preserved).
- Race fix: in `generateQuizArtifact`, on the `activePassageIdRef.current !== passageId` branch,
  instead of `status:"error"`, store the questions in `resultDetailById[artifactId]` (updated from passage to artifact logic) and set
  `status:"completed"` for that passage's cache. Do not touch global `error`/active view. Confirm
  `studio-panel` renders cached completed results when the user returns to that passage.
- Attempt Tracking: `QuizContent` receives `artifactId` as a prop (passed down from `studio-panel.tsx`) and calls `createQuizAttemptForArtifact(artifactId)` instead of passing `passageId`.

## Related Code Files

- Modify: `src/features/study/ui/studio/studio-panel.tsx`
  - Pass `artifactId={viewingArtifact.id}` to `QuizContent`.
- Modify: `src/features/study/ui/studio/quiz/quiz-content.tsx`
  - Accept `artifactId` prop instead of `passageId`.
  - Render `sourceText` + `sourceLine` in feedback.
  - Add attempt-create failure state + recoverable inline message + retry.
- Modify: `src/features/study/ui/studio/quiz/quiz-results.tsx`
  - Add attempt-complete failure state + recoverable inline message + retry; keep score visible.
- Modify: `src/features/study/hooks/use-study-actions.ts`
  - Fix passage-switch branch in `generateQuizArtifact` to preserve the result.
- Read for context: `studio-panel.tsx` (how `detail.questions` / completed results render),
  `study-response-schema.ts` (DTO field names), i18n message catalog for new strings.
- i18n: add keys (e.g. `source`, `attemptSaveFailed`, `retry`) to the `Study` namespace in the
  message files; follow existing `useTranslations("Study")` usage. Verify all locales.

## Implementation Steps

1. Add new `Study` i18n keys to every locale file (source label, persistence-failed message, retry).
2. `studio-panel.tsx`: pass `artifactId={viewingArtifact.id}` down to `QuizContent`.
3. `quiz-content.tsx`: update props to receive `artifactId` and call `createQuizAttemptForArtifact(artifactId)` when checking an answer.
4. `quiz-content.tsx`: render source quote in the feedback area using `currentQuestion.sourceText`
   and `currentQuestion.sourceLine`.
5. `quiz-content.tsx`: introduce `attemptError` state; set it when `createQuizAttemptForArtifact`
   returns `{error}` or throws; render a dismissible/retry inline banner; never block feedback.
6. `quiz-results.tsx`: capture the `completeQuizAttempt` rejection into state; render inline
   recoverable message + retry button; keep the score card always visible.
7. `use-study-actions.ts`: change the passage-switch branch to complete the result into its own
   passage cache (store questions + `status:"completed"`) rather than marking `error`.
8. Manual check in app: generate quiz, switch passage mid-generation, switch back -> result
   present; force a persistence failure (e.g. offline) -> message shown, quiz still usable.
9. typecheck + lint.

## Success Criteria

- [ ] Source quote (text + line) visible per question after answering.
- [ ] Attempt create/complete failure shows a recoverable message; quiz stays usable; score shows.
- [ ] Switching passage mid-generation keeps the generated quiz available on its own passage.
- [ ] Keyboard flow and existing generation states unchanged.
- [ ] `QuizContent` calls the API with `artifactId`.
- [ ] typecheck + lint pass.

## Risk Assessment

- Race fix could surface a result the user "abandoned": acceptable per #69 ("keep result
  available"); it stays scoped to its own passage cache, never the active one.
- New i18n keys missing in a locale -> runtime fallback noise: mitigate by adding to all locales
  and grepping for the keys.
- React Strict Mode double-invoke of the complete effect already handled server-side
  (already-completed -> rejected); ensure the new error UI does not show on that benign second call
  (guard on first settle, or ignore "already completed" specifically).
