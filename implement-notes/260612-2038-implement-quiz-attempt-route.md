# Implement quiz-attempt route

## 1. API contract / Expected behavior

Route `/api/quiz-attempt` tracks one learner quiz attempt for a study session.

Expected `POST /api/quiz-attempt`:

- Requires authenticated user.
- Accepts strictly typed JSON body (`.strict()`):
  ```ts
  {
    studySessionId: string; // UUID, must belong to current user
    artifactId?: string; // UUID, optional, must belong to current user when provided
  }
  ```
- Creates a quiz attempt linked to the owned study session.
- Stores `artifactId` when provided, otherwise stores `null`.
- Returns success envelope:
  ```ts
  {
    success: true;
    data: QuizAttemptDto;
  }
  ```
- Returns clear errors:
  - `400` for malformed JSON, invalid request body, or extra fields.
  - `401` for unauthenticated request.
  - `404` for missing/not-owned session or artifact.
  - `500` only for unexpected server failures.

Expected `PATCH /api/quiz-attempt`:

- Requires authenticated user.
- Accepts strictly typed JSON body (`.strict()`):
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
  - `400` for malformed JSON, invalid counts, invalid UUIDs, extra fields, or already completed attempt.
  - `401` for unauthenticated request.
  - `404` for missing/not-owned attempt.
  - `500` only for unexpected server failures.

Expected client behavior in Study quiz flow:

- First answer creates a study session, then creates a quiz attempt.
- Final results complete the attempt once.
- UI should not lose quiz-taking ability when persistence fails.
- Persistence failures must be visible via a non-blocking inline banner with a retry action, allowing the learner to see the error but continue taking the quiz or view their final score.
- Mid-generation passage switches must retain the generated quiz results in the originating passage's cache instead of discarding them.

## 2. Current implementation

Current route file:

- `src/app/api/quiz-attempt/route.ts`

Current data/query file:

- `src/lib/db/quiz-attempt-queries.ts`

Current client helper:

- `src/features/study/api/quiz-attempt-client.ts`

Current tests:

- `tests/vitest/integration/api/quiz-attempt-route.test.ts`

What `POST /api/quiz-attempt` really does now (OUTDATED - currently uses `passageId`):

- Parses JSON manually.
- Validates (not strictly):
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
- Validates (not strictly):
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
- Switching passage mid-generation discards a valid generation and marks it as an error instead of saving it to the original passage's cache.
- The `sourceText` and `sourceLine` are included in `QuestionData` but are not rendered in `quiz-content.tsx`.

Current test coverage:

- `POST` success with passage (needs update to artifact).
- `POST` success without passage (needs update to artifact).
- `POST` invalid body.
- `POST` invalid JSON.
- `POST` missing/not-owned session from query layer (currently expecting 400).
- `PATCH` success with computed accuracy.
- `PATCH` missing fields.
- `PATCH` already completed attempt.
- `PATCH` missing/not-owned attempt (currently expecting 400).

## 3. Gaps

Route-level gaps:

- Authentication errors are not explicitly mapped to `401`.
- Missing/not-owned resources are currently returned as `400`. Must be mapped to `404` to match project conventions (e.g., `study-session` route).
- Request schemas are not `.strict()`. Extra body fields are silently stripped.
- Data model still uses `passageId` instead of `artifactId`, which is incompatible with the new `StudioArtifact` model where multiple quizzes can exist per passage.
- No explicit test for unauthenticated `POST` or unauthenticated `PATCH`.
- No explicit test for invalid count sum on `PATCH`.
- No explicit test for invalid optional `artifactId` ownership on `POST`.
- No explicit test that `PATCH` updates the linked `StudySession`.

Study UI integration gaps related to this route:

- Quiz attempt creation uses `passageId` instead of `artifactId`.
- Quiz attempt creation failure is invisible to the learner (swallowed in `QuizContent`).
- Quiz attempt completion failure is invisible to the learner (swallowed in `QuizResults`).
- Double-invocation of the complete effect in React Strict Mode sends already-completed errors. The UI needs to gracefully handle this without showing error banners for benign second calls.
- Valid quiz generations are lost if the learner switches passages during generation.
- Missing test coverage for the React components using `NextIntlClientProvider` + real `en.json` messages.

## 4. Implementation plan

Route hardening and Schema Migration (Phase 1):

1. **Migrate Database:** Update `QuizAttempt` to use `artifactId` instead of `passageId`. Add a migration to drop `passageId` and add `artifactId` (UUID, nullable) as an FK to `StudioArtifact`. Update the ERD and Data Dictionary.
2. Add explicit auth-error handling in `src/app/api/quiz-attempt/route.ts`.
   - Use `isAuthenticationRequiredError`.
   - Return `401` with `{ error: "Authentication required." }`.
3. Introduce typed ownership/resource error mapping.
   - Use `isOwnershipMissError` to catch missing/not-owned resources and map them to `404`. Update to use `artifact` instead of `passage`.
4. Make request schemas strict and update fields.
   - Change `passageId` to `artifactId` in `quizAttemptPostSchema`.
   - Apply `.strict()` to `quizAttemptPostSchema` and `quizAttemptPatchSchema`.
5. Add and update route tests.
   - Assert `404` for missing/not-owned resources instead of `400`.
   - Test unauthenticated `POST` and `PATCH` return `401`.
   - Test `PATCH` rejects mismatched counts.
   - Test `POST` rejects not-owned artifact.
6. Add query tests for DB side effects if not already present.
   - `createQuizAttempt` requires owned study session and optionally an owned artifact.
   - `completeQuizAttempt` updates `QuizAttempt`.
   - `completeQuizAttempt` updates linked `StudySession`.
   - Already-completed attempt is rejected.
   - Not-owned attempt is rejected.

Study UI UX completion (Phase 2):

7. Render the source quote (`sourceText`, `sourceLine`) in `quiz-content.tsx` inside the feedback block.
8. Surface persistence failures.
   - Update `QuizContent` to use `artifactId` in the client call: `createQuizAttemptForArtifact(artifactId)`.
   - Add inline banner + Retry button in `QuizContent` for attempt-create failures.
   - Add inline banner + Retry button in `QuizResults` for attempt-complete failures.
   - Ensure the UI remains non-blocking (quiz stays usable, score card stays visible).
   - Ignore benign React Strict Mode double-invoke "already completed" errors.
9. Fix the passage-switch race condition.
   - In `use-study-actions.ts`, keep the generated quiz result in its originating passage's cache instead of changing its status to `"error"`.

Test coverage (Phase 3):

10. Add component tests around the current client helper usage.
    - First checked answer calls `createQuizAttemptForArtifact`.
    - Completed quiz calls `completeQuizAttempt`.
    - Failure shows banner but does not block answer feedback or final score.
    - Use a reusable test render helper with `NextIntlClientProvider` and `en.json` messages.

## 5. Test plan

Route tests:

- `POST /api/quiz-attempt`
  - Creates attempt with `studySessionId` and `artifactId`.
  - Creates attempt with `studySessionId` only and returns `artifactId: null`.
  - Rejects invalid JSON with `400`.
  - Rejects invalid `studySessionId` with `400`.
  - Rejects invalid `artifactId` with `400`.
  - Rejects not-owned/missing study session with `404`.
  - Rejects not-owned/missing artifact with `404`.
  - Rejects unauthenticated request with `401`.

- `PATCH /api/quiz-attempt`
  - Completes attempt and returns computed `accuracyRate`.
  - Rejects invalid JSON with `400`.
  - Rejects missing fields with `400`.
  - Rejects invalid UUID with `400`.
  - Rejects negative counts with `400`.
  - Rejects `correctCount + incorrectCount !== totalQuestions` with `400`.
  - Rejects already-completed attempt.
  - Rejects not-owned/missing attempt with `404`.
  - Rejects unauthenticated request with `401`.

Query tests:

- `createQuizAttempt`
  - Requires owned study session.
  - Requires owned artifact when `artifactId` is provided.
  - Stores `artifactId: null` when omitted.

- `completeQuizAttempt`
  - Updates quiz attempt counts, accuracy, and `completedAt`.
  - Updates linked study session counts, accuracy, and `completedAt`.
  - Rejects already-completed attempts.
  - Rejects attempts owned by another user.

Study UI tests:

- Component test infrastructure leverages `NextIntlClientProvider` + `en.json` messages.
- First answer creates a study session and quiz attempt.
- Final score renders after all questions answered.
- `QuizResults` calls `completeQuizAttempt` once per completed attempt.
- Attempt creation failure shows an inline retry banner but allows continuing.
- Attempt completion failure shows an inline retry banner but leaves the score visible.
- Race conditions during generation correctly populate the original passage cache.

Suggested commands:

```bash
pnpm run db:generate
pnpm run typecheck
pnpm run lint
pnpm exec vitest tests/vitest/integration/api/quiz-attempt-route.test.ts --config tests/vitest/vitest.config.ts
pnpm run test
```

## 6. Acceptance criteria

- `QuizAttempt` database schema migrated to use `artifactId` (FK to `StudioArtifact`) instead of `passageId`.
- `POST /api/quiz-attempt` creates attempts only for authenticated users and owned study sessions.
- `POST /api/quiz-attempt` rejects malformed JSON, invalid UUIDs, missing/not-owned study sessions (`404`), and missing/not-owned artifacts (`404`).
- `PATCH /api/quiz-attempt` completes attempts only for authenticated users and owned attempts.
- `PATCH /api/quiz-attempt` validates count math before writing.
- `PATCH /api/quiz-attempt` updates both `QuizAttempt` and linked `StudySession`.
- Already-completed attempts cannot be completed again as a successful write.
- Auth failures return `401`, not `500`.
- Ownership/not-owned resource errors map to `404` using `isOwnershipMissError`.
- Persistence failures display inline banners with Retry without blocking UI interactions.
- Passage switching during quiz generation does not throw away valid artifacts.
- Tests cover success, validation errors, auth errors, ownership misses, already-completed attempts, and React UI components.