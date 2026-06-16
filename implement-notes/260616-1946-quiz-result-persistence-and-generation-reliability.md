# Quiz result persistence + generation reliability

> **Supersedes `260612-2038-implement-quiz-attempt-route.md`.** That note targeted a
> `/api/quiz-attempt` POST/PATCH route backed by a `QuizAttempt` table. Both are GONE.
> Quiz outcomes now persist as a `QuizResult` (1:1 with the quiz `StudioArtifact`) via
> **server actions**, and `StudySession` is a presence/heartbeat record only. This note
> describes the current flow and the real remaining gaps.

## 1. Current flow (verified against code)

### Quiz result persistence — server actions, no HTTP route

- No `QuizAttempt` model, no `/api/quiz-attempt` route, no `createQuizAttempt*` client.
- A quiz outcome is a `QuizResult` row, 1:1 with its quiz `StudioArtifact`
  (`prisma/schema/studio.prisma:63` — `artifactId @unique`, `correctCount`,
  `totalQuestions`, `accuracyRate`, `completedAt`).
- Written via server actions in `src/features/study/actions/studio-artifact-actions.ts`:
  - `studioRecordQuizResultAction({ artifactId, correctCount, totalQuestions })`
    → `recordQuizResult()` (`studio-artifacts-service.ts:111`) → `db.quizResult.upsert`.
    Validates counts in the action; ownership enforced via parent `StudioArtifact`
    (`findUnique({ id: artifactId, userId })`), not a session.
  - `studioResetQuizResultAction({ artifactId })` → `resetQuizResult()` → `deleteMany`.
    Used by the results "Try again" button.
- Auth via `getAuthenticatedUser`; each action wrapped in
  `Sentry.withServerActionInstrumentation`; returns `T | { error: string }`.

### Quiz UI (already implements the old Phase 2 wishlist)

- `quiz-content.tsx` — takes `artifactId: string | null`; renders the source quote
  (`sourceText` + `sourceLine`) in the feedback block (`:207-214`); keyboard flow
  (1-4 / Enter / Backspace) intact.
- `quiz-results.tsx` — records the result on mount (`useEffect → recordResult`),
  guards the React Strict-Mode double-invoke with `isSavingRef` (`:33,36`), shows a
  non-blocking save-error banner + Retry (`:85-96`) while keeping the score visible.

### StudySession — presence/heartbeat only

- `StudySession` no longer carries counts/accuracy/passageId
  (`prisma/schema/study-session.prisma`): `startedAt`, `lastActivityAt`, `completedAt`.
- `/api/study-session` POST → `ensureActiveSession(userId)`; 401 (auth), 400 (bad
  JSON/zod), 500 fallback. Body is `{}` `.strict()`.
- Driven by `useStudySessionHeartbeat` (`60s` interval + `visibilitychange`); feeds
  the progress dashboard's time-studied stat. Not part of quiz scoring.

### Generation

- `/api/studio-questions` POST generates questions; `generateQuizArtifact` in
  `src/features/study/hooks/use-study-actions.ts` drives the optimistic card
  (`generating` → `done` / `failed`). Artifact rows persist via
  `studioCreate/Complete/FailArtifactAction`.

## 2. Already done — do NOT rebuild

- Source quote rendered in quiz feedback.
- Attempt-save failure → inline banner + Retry; score stays visible; double-invoke guarded.
- `artifactId` threaded into `QuizContent` / `QuizResults`.
- Quiz scoring decoupled from `StudySession` (now `QuizResult` child of the artifact).

## 3. Real remaining gaps

### A. Generation failure contract + timeout — PRIORITY (plan Phase 0)

See `plans/260615-issue-69-study-quiz-flow/phase-00-generation-failure-and-timeout.md`.

- **Opaque failure:** a failed generation persists only `status: "failed"` — no reason.
  Backend message returned once then lost; user sees generic "failed", developer can't
  read the row, reason gone after reload.
- **Progress hell loop:** client generation fetch (`postJson`) has no timeout → a hung
  request leaves the artifact stuck `generating`, and the action lock blocks the 2nd
  generation indefinitely. Backend call also unbounded.
- Fix: one shared `StudioArtifactErrorCode` (+ optional `errorDetail`) persisted on
  `StudioArtifact` and rendered as a localized message; client + backend timeout
  (`STUDIO_GENERATION_TIMEOUT_MS`) that always settles to `failed (TIMEOUT)` and
  releases the lock; Retry button on the failed card. Confirmed decisions: structured
  code + detail, client+backend timeout, Retry on the failed card.

### B. Passage-switch race (still present)

- `use-study-actions.ts:99-102` — on `activePassageIdRef.current !== passageId`, a
  completed generation is marked `failed`, discarding a valid result. Results are keyed
  by passage/artifact, so wrong-passage attachment is not possible; the guard only
  DISCARDS. Fix: complete the result into its originating passage's cache (do not mark
  failed). This branch also needs the Phase 0 error-code treatment for true failures.

### C. Test coverage

- Server-action persistence: `studioRecordQuizResultAction` validates counts + parent
  ownership; `studioResetQuizResultAction` clears the row.
- Component: first answer → feedback; final score renders; record-on-mount fires once
  (double-invoke guard); save failure shows banner without blocking score; use a
  reusable `NextIntlClientProvider` + real `en.json` render helper (first component test
  precedent in the repo).
- Generation: failure persists an `errorCode`; a stalled request settles to
  `failed (TIMEOUT)` and unlocks; Retry re-runs.

## 4. Suggested commands

```bash
pnpm run db:generate
pnpm run typecheck
pnpm run lint
pnpm run test
```

## 5. Acceptance criteria

- Quiz outcome persists as a `QuizResult` child of the quiz `StudioArtifact` via server
  actions; ownership enforced through the parent artifact.
- Save failure is visible (banner + Retry), non-blocking; score always shown; record
  fires once under Strict Mode.
- Failed generation persists `errorCode` (+ optional `errorDetail`); failed card shows a
  localized reason + Retry; reason survives reload.
- A hung generation settles to `failed` within `STUDIO_GENERATION_TIMEOUT_MS` (client),
  releasing the lock; backend cannot hang past the budget.
- Passage switch mid-generation keeps the generated quiz on its originating passage.

## 6. Open questions

- None. Stale `QuizAttempt`/`quiz-attempt` references in docs + `tests/vitest/vitest.config.ts`
  were reconciled to the `QuizResult`/server-action model on 2026-06-16.
