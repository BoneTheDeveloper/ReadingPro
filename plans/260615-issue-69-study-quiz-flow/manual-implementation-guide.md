# Manual Implementation Guide — Issue #69 Quiz Flow

Hands-on map for implementing the flow yourself with Claude's help. Ordered by what to touch
first (isolated/low-risk → integrated). Each focus block is independent — finish one, verify,
then move on. Line anchors are approximate; confirm before editing.

## The end-to-end flow (where each piece lives)

```text
[Generate quiz button]                         studio-panel.tsx  (action card)
   -> handleActionClick(cardId="quiz")         hooks/use-study-actions.ts:183
   -> generateQuizArtifact(passageId,resultId) hooks/use-study-actions.ts:89   <-- FOCUS 4 (race)
   -> generateStudyQuestions()                 api/study-questions-client.ts
   -> studyGenerateQuestionsAction()           actions/study-generate-questions-action.ts
   -> result cached in resultsByPassageId + resultDetailById

[View quiz]                                     studio-panel.tsx:240 renders <QuizContent>

[Answer questions]                              ui/studio/quiz/quiz-content.tsx        <-- FOCUS 2 + 3
   -> first checked answer: handleCheckAnswer   quiz-content.tsx:45
   -> createQuizAttemptForPassage(passageId)    api/quiz-attempt-client.ts:7
       -> POST /api/study-session               app/api/study-session/route.ts
       -> POST /api/quiz-attempt                 app/api/quiz-attempt/route.ts          <-- FOCUS 1
           -> createQuizAttempt()                lib/db/quiz-attempt-queries.ts:4

[Finish -> results]                             ui/studio/quiz/quiz-results.tsx        <-- FOCUS 3
   -> completeQuizAttempt() on mount            quiz-results.tsx:29
       -> PATCH /api/quiz-attempt               app/api/quiz-attempt/route.ts          <-- FOCUS 1
           -> completeQuizAttempt()             lib/db/quiz-attempt-queries.ts:47
               -> updates QuizAttempt + StudySession (one transaction)
```

> Already working (do NOT rebuild): generation running/completed/failed states
> (`studio-panel.tsx:459-507`), duplicate-generation lock (`:355-364`), keyboard flow
> (`quiz-content.tsx:83-98`), per-passage caching.

---

## FOCUS 1 — Harden the quiz-attempt API  (Phase 1 · backend · do first, easiest)

| | |
|---|---|
| **Edit** | `src/app/api/quiz-attempt/route.ts` |
| **Copy pattern from** | `src/app/api/study-session/route.ts` (already does 401/404/400/500) |
| **Helpers** | `src/lib/api/route-errors.ts` (`isAuthenticationRequiredError`, `isOwnershipMissError`, `getZodErrorMessage`) |
| **Do NOT touch** | `src/lib/db/quiz-attempt-queries.ts` — its error messages already match the 404 helper |

What to change in BOTH `POST` and `PATCH` catch blocks (order matters):
1. `isAuthenticationRequiredError(error)` → 401
2. `isOwnershipMissError(error, ['study session','passage','quiz attempt'])` → 404
3. `error instanceof z.ZodError` → 400 (`getZodErrorMessage(error)`)
4. else → log + Sentry + 500

Also add `.strict()` to `quizAttemptPostSchema` and `quizAttemptPatchSchema` (PATCH:
`z.object({...}).strict().refine(...)`).
**Verify:** `pnpm run typecheck`.

---

## FOCUS 2 — Show the source quote in the quiz  (Phase 2 · pure UI · isolated)

| | |
|---|---|
| **Edit** | `src/features/study/ui/studio/quiz/quiz-content.tsx` (feedback block ~`:194-201`) |
| **Data already there** | `currentQuestion.sourceText`, `currentQuestion.sourceLine` (`model/types.ts:52-53`) |

Render the quote near the explanation, only when `showFeedback`. No data wiring needed — it's
already in `QuestionData`; the component just never displays it.
**Verify:** generate a quiz, answer a question, confirm the quote + line show.

---

## FOCUS 3 — Make persistence failures visible + recoverable  (Phase 2 · UI state)

Decision: **inline banner + Retry** (non-blocking; quiz stays usable; score stays visible).

| Step | Edit | Where |
|---|---|---|
| 3a | `src/features/study/ui/studio/quiz/quiz-content.tsx` | attempt-create swallow at `:55` (`catch { setSessionId(null) }`) |
| 3b | `src/features/study/ui/studio/quiz/quiz-results.tsx` | complete swallow at `:36` (`.catch(() => {})`) |
| 3c | `localization/messages/en.json` + `vi.json` | add `Study` keys: e.g. `attemptSaveFailed`, `retry`, `source` |

- 3a: add `attemptError` state; set on `{error}` / throw; render dismissible inline banner with a
  Retry that re-calls `createQuizAttemptForPassage`. Never block answer feedback.
- 3b: capture the rejection into state; show inline recoverable message + Retry; **keep the score
  card always visible**. Ignore the benign "already completed" rejection (Strict-Mode double-call).
**Verify:** simulate offline → message appears, quiz/score still work; Retry succeeds when back online.

---

## FOCUS 4 — Fix the passage-switch race  (Phase 2 · hook logic · changes existing behavior)

| | |
|---|---|
| **Edit** | `src/features/study/hooks/use-study-actions.ts:93-95` (inside `generateQuizArtifact`) |

Today: if `activePassageIdRef.current !== passageId` when generation finishes, it marks the result
`error` and **throws away a valid quiz**. Decision: **keep it on its originating passage** —
store `result.questions` in `resultDetailById[resultId]` and set `status:"completed"` for that
passage's cache (results are already keyed by `passageId`, so no mis-attach risk). Don't touch the
global `error` or the active view.
**Verify:** start generation, switch passage immediately, switch back → completed quiz is there.

---

## FOCUS 5 — Tests  (Phase 3 · after the code is in)

First `.test.tsx` in the repo — add helper `tests/vitest/helpers/render-with-intl.tsx`
(`NextIntlClientProvider` + real `en.json`) and reuse it. Then:
- `tests/vitest/integration/api/quiz-attempt-route.test.ts`: flip ownership 400→404; add 401, count
  mismatch, strict-key rejection.
- `quiz-content.test.tsx`: first-answer creates attempt, keyboard flow, source quote, failure-still-usable.
- `quiz-results.test.tsx`: complete-once, failure-keeps-score.
- `use-study-actions.test.ts`: generation success/error + passage-switch-keeps-result.
**Verify:** `pnpm run test && pnpm run typecheck && pnpm run lint`.

---

## Suggested order for a manual session

1. FOCUS 1 (backend, self-contained) → typecheck.
2. FOCUS 2 (one render block) → eyeball.
3. FOCUS 3 (failure UX + i18n) → manual offline check.
4. FOCUS 4 (race) → manual switch check.
5. FOCUS 5 (lock it all in with tests).

Tell Claude e.g. "let's do FOCUS 1" and it'll make that single edit with you.
