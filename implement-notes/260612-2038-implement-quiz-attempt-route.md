# Implement quiz-attempt route

## 1. API contract / Expected behavior

Route `/api/quiz-attempt` tracks one learner quiz attempt for a study session.

Expected `POST /api/quiz-attempt`:

- Requires authenticated user.
- Accepts JSON body:
  ```ts
  {
    studySessionId: string; // UUID, must belong to current user
    passageId?: string; // UUID, optional, must belong to current user when provided
  }
  ```
- Creates a quiz attempt linked to the owned study session.
- Stores `passageId` when provided, otherwise stores `null`.
- Returns success envelope:
  ```ts
  {
    success: true;
    data: QuizAttemptDto;
  }
  ```
- Returns clear errors:
  - `400` for malformed JSON or invalid request body.
  - `401` for unauthenticated request.
  - `404` or `400` for missing/not-owned session or passage, depending on project convention.
  - `500` only for unexpected server failures.

Expected `PATCH /api/quiz-attempt`:

- Requires authenticated user.
- Accepts JSON body:
  ```ts
  {
    attemptId: string; // UUID, must belong to current user
    correctCount: number;
    incorrectCount: number;
    totalQuestions: number;
  }
  ```
- Validates `correctCount + incorrectCount === totalQuestions`.
- Completes an unfinished quiz attempt.
- Calculates `accuracyRate`.
- Sets `completedAt`.
- Updates the linked `StudySession` counts, accuracy, and `completedAt`.
- Rejects already completed attempts.
- Returns success envelope:
  ```ts
  {
    success: true;
    data: QuizAttemptDto;
  }
  ```
- Returns clear errors:
  - `400` for malformed JSON, invalid counts, invalid UUIDs, already completed attempt.
  - `401` for unauthenticated request.
  - `404` or `400` for missing/not-owned attempt, depending on project convention.
  - `500` only for unexpected server failures.

Expected client behavior in Study quiz flow:

- First answer creates a study session, then creates a quiz attempt.
- Final results complete the attempt once.
- UI should not lose quiz-taking ability when persistence fails, but should expose persistence failure somewhere recoverable if progress tracking matters.

## 2. Current implementation

Current route file:

- `src/app/api/quiz-attempt/route.ts`

Current data/query file:

- `src/lib/db/quiz-attempt-queries.ts`

Current client helper:

- `src/features/study/api/quiz-attempt-client.ts`

Current tests:

- `tests/vitest/integration/api/quiz-attempt-route.test.ts`

What `POST /api/quiz-attempt` really does now:

- Parses JSON manually.
- Validates:
  - `studySessionId` is UUID and required.
  - `passageId` is UUID and optional.
- Calls `getAuthenticatedUser()`.
- Calls `createQuizAttempt(studySessionId, user.id, passageId)`.
- `createQuizAttempt` checks:
  - Study session exists for `studySessionId` and `userId`.
  - Optional passage exists for `passageId`, `userId`, and `deletedAt: null`.
- Creates `QuizAttempt` with:
  - `studySessionId`
  - `userId`
  - `passageId ?? null`
  - `startedAt: new Date()`
- Returns `{ success: true, data: toQuizAttemptDto(attempt) }`.
- Converts `z.ZodError` from validation/query layer to `400`.
- Converts all other errors to `500` and captures in Sentry.

What `PATCH /api/quiz-attempt` really does now:

- Parses JSON manually.
- Validates:
  - `attemptId` is UUID.
  - `correctCount` is nonnegative integer.
  - `incorrectCount` is nonnegative integer.
  - `totalQuestions` is positive integer.
  - `correctCount + incorrectCount === totalQuestions`.
- Calls `getAuthenticatedUser()`.
- Calls `completeQuizAttempt(attemptId, user.id, counts)`.
- `completeQuizAttempt` checks:
  - Attempt exists for `attemptId` and `userId`.
  - Attempt has not already been completed.
- Calculates accuracy:
  ```ts
  Math.round((correctCount / totalQuestions) * 100 * 100) / 100
  ```
- In one transaction:
  - Updates `QuizAttempt` counts, accuracy, and `completedAt`.
  - Updates linked `StudySession` counts, accuracy, and `completedAt`.
- Returns `{ success: true, data: toQuizAttemptDto(completed) }`.
- Converts `z.ZodError` from validation/query layer to `400`.
- Converts all other errors to `500` and captures in Sentry.

What Study UI really does now:

- `createQuizAttemptForPassage(passageId)` first calls `/api/study-session`, then calls `/api/quiz-attempt`.
- `QuizContent` calls `createQuizAttemptForPassage` on first checked answer.
- If attempt creation fails, `QuizContent` swallows the failure and still shows quiz feedback.
- `QuizResults` calls `completeQuizAttempt` on mount when `attemptId` exists.
- If completion fails, `QuizResults` swallows the failure.

Current test coverage:

- `POST` success with passage.
- `POST` success without passage.
- `POST` invalid body.
- `POST` invalid JSON.
- `POST` missing/not-owned session from query layer.
- `PATCH` success with computed accuracy.
- `PATCH` missing fields.
- `PATCH` already completed attempt.
- `PATCH` missing/not-owned attempt.

## 3. Gaps

Route-level gaps:

- Authentication errors are not explicitly mapped to `401`.
  - Current route catches only `z.ZodError` specially.
  - If `getAuthenticatedUser()` throws auth-required error, current route likely falls into generic `500`.
- Missing/not-owned resources are returned as `400` because query layer throws `z.ZodError`.
  - This matches current tests, but it is less precise than `404`.
  - Keep as-is only if project convention accepts ownership misses as validation errors here.
- Request schemas are not `.strict()`.
  - Extra body fields are silently stripped by Zod.
  - Other routes in this repo often use strict route contracts.
- Error payload shape is `{ error: string }`, while success is `{ success: true, data }`.
  - This matches several existing route patterns, but it is not a full success/error envelope symmetry.
- No explicit test for unauthenticated `POST` or unauthenticated `PATCH`.
- No explicit test for invalid count sum on `PATCH`.
- No explicit test for invalid optional `passageId` ownership on `POST`.
- No explicit test that `PATCH` updates the linked `StudySession`.
  - Unit/integration route mock only checks `completeQuizAttempt` call.
  - Query-level behavior should be covered separately if not already.

Study UI integration gaps related to this route:

- Quiz attempt creation failure is invisible to learner.
  - The quiz still works locally, but progress may not persist.
- Quiz attempt completion failure is invisible to learner.
  - Final score is visible locally, but progress dashboard may not update.
- Completion effect can run twice in React Strict Mode if remounted with same `attemptId`.
  - The server rejects already-completed attempts.
  - Current UI swallows the second failure, so user probably does not see it.
  - This is acceptable for learner UX but noisy for logs if it happens often.
- No UI/component tests prove:
  - First answer creates attempt.
  - Final results complete attempt.
  - Persistence failures keep quiz usable.
  - Persistence failures are surfaced if we decide they should be visible.

## 4. Implementation plan

Minimal route hardening:

1. Add explicit auth-error handling in `src/app/api/quiz-attempt/route.ts`.
   - Use the same project helper/pattern as other routes: `isAuthenticationRequiredError`.
   - Return `401` with `{ error: "Authentication required." }`.

2. Decide resource-miss status convention.
   - Conservative option: keep current `400` behavior because tests already expect it.
   - Cleaner option: introduce typed ownership/resource errors and return `404`.
   - For issue #69, keep `400` unless there is a broader API contract cleanup.

3. Make request schemas strict.
   - `quizAttemptPostSchema.strict()`
   - `quizAttemptPatchSchema.strict()`
   - Update tests if error messages change.

4. Add missing route tests.
   - Unauthenticated `POST` returns `401`.
   - Unauthenticated `PATCH` returns `401`.
   - `PATCH` rejects mismatched counts.
   - `POST` rejects not-owned passage.

5. Add query tests for DB side effects if not already present.
   - `completeQuizAttempt` updates `QuizAttempt`.
   - `completeQuizAttempt` updates linked `StudySession`.
   - Already-completed attempt is rejected.
   - Not-owned attempt is rejected.

Study UI follow-up for issue #69:

6. Decide whether persistence failures should be visible.
   - If yes: add local persistence error state in `QuizContent` / `QuizResults`.
   - If no: document as graceful degradation and keep route tests as proof.

7. Add component tests around the current client helper usage.
   - First checked answer calls `createQuizAttemptForPassage(passageId)`.
   - Completed quiz calls `completeQuizAttempt`.
   - Failure does not block answer feedback or final score.

## 5. Test plan

Route tests:

- `POST /api/quiz-attempt`
  - Creates attempt with `studySessionId` and `passageId`.
  - Creates attempt with `studySessionId` only and returns `passageId: null`.
  - Rejects invalid JSON with `400`.
  - Rejects invalid `studySessionId` with `400`.
  - Rejects invalid `passageId` with `400`.
  - Rejects not-owned/missing study session.
  - Rejects not-owned/missing passage.
  - Rejects unauthenticated request with `401`.

- `PATCH /api/quiz-attempt`
  - Completes attempt and returns computed `accuracyRate`.
  - Rejects invalid JSON with `400`.
  - Rejects missing fields with `400`.
  - Rejects invalid UUID with `400`.
  - Rejects negative counts with `400`.
  - Rejects `correctCount + incorrectCount !== totalQuestions` with `400`.
  - Rejects already-completed attempt.
  - Rejects not-owned/missing attempt.
  - Rejects unauthenticated request with `401`.

Query tests:

- `createQuizAttempt`
  - Requires owned study session.
  - Requires owned passage when `passageId` is provided.
  - Stores `passageId: null` when omitted.

- `completeQuizAttempt`
  - Updates quiz attempt counts, accuracy, and `completedAt`.
  - Updates linked study session counts, accuracy, and `completedAt`.
  - Rejects already-completed attempts.
  - Rejects attempts owned by another user.

Study UI tests:

- First answer creates a study session and quiz attempt through `createQuizAttemptForPassage`.
- Final score renders after all questions answered.
- `QuizResults` calls `completeQuizAttempt` once per completed attempt in the expected render path.
- Attempt creation failure still allows answer feedback.
- Attempt completion failure still leaves final score visible.

Suggested commands:

```bash
pnpm exec vitest tests/vitest/integration/api/quiz-attempt-route.test.ts --config tests/vitest/vitest.config.ts
pnpm run test
pnpm run typecheck
```

## 6. Acceptance criteria

- `POST /api/quiz-attempt` creates attempts only for authenticated users and owned study sessions.
- `POST /api/quiz-attempt` rejects malformed JSON, invalid UUIDs, missing/not-owned study sessions, and missing/not-owned passages.
- `PATCH /api/quiz-attempt` completes attempts only for authenticated users and owned attempts.
- `PATCH /api/quiz-attempt` validates count math before writing.
- `PATCH /api/quiz-attempt` updates both `QuizAttempt` and linked `StudySession`.
- Already-completed attempts cannot be completed again as a successful write.
- Auth failures return `401`, not `500`.
- Tests cover success, validation errors, auth errors, ownership misses, and already-completed attempts.
- Study quiz UI can still show learner results even if attempt persistence fails.
- If persistence failure visibility is in scope for issue #69, the learner sees a recoverable message instead of silent failure.
