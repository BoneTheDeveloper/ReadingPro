# Study Quiz Flow — Status Note

_Updated 2026-06-16. Quick snapshot of how the quiz flow works now, what's done, and what's left._

## Current flow (the map)

```
Generate quiz        POST /api/studio-questions
  route              src/app/api/studio-questions/route.ts
  service            src/lib/study/passage/passage-study.service.ts  (generateQuestionsForPassage)
  client + hook      src/features/study/api/studio-questions-client.ts
                     src/features/study/hooks/use-study-actions.ts   (generateQuizArtifact)

Quiz card state      StudioArtifact  (status: generating | done | failed)
  schema             prisma/schema/studio.prisma
  persist actions    src/features/study/actions/studio-artifact-actions.ts
                     (create / complete / fail)
  service            src/lib/study/passage/studio-artifacts-service.ts

Take quiz / score    src/features/study/ui/studio/quiz/quiz-content.tsx
                     src/features/study/ui/studio/quiz/quiz-results.tsx
  save result        studioRecordQuizResultAction  ->  QuizResult (1:1 with the quiz StudioArtifact)
  reset result       studioResetQuizResultAction

Presence (not score) StudySession  — heartbeat only (startedAt / lastActivityAt / completedAt)
  route + hook       src/app/api/study-session/route.ts
                     src/features/study/hooks/use-study-session-heartbeat.ts
```

> Quiz outcomes are a `QuizResult` saved via **server actions** — there is no
> `/api/quiz-attempt` route and no `QuizAttempt` table (both removed).

## ✅ Working today (don't rebuild)

- Quiz generation with optimistic card → `generating` / `done` / `failed`.
- Quiz scoring saved as `QuizResult`; auth + ownership-via-parent-artifact + count validation in the action.
- Source quote (`sourceText` + `sourceLine`) shown in feedback — `quiz-content.tsx:207-214`.
- Save-failure → non-blocking banner + Retry, score stays visible, double-save guarded by `isSavingRef` — `quiz-results.tsx`.
- Keyboard flow (1-4 / Enter / Backspace).
- `StudySession` decoupled from scoring; heartbeat feeds the progress dashboard.

## 🔧 To improve (in priority order)

1. **Generation failures are opaque** (priority). A failed card shows only "failed" — the
   real reason is lost (row keeps `status` only). → persist a shared `errorCode` (+ `errorDetail`)
   and show a localized reason.
2. **Progress hell loop** (priority). The generation fetch has no timeout, so a hung request
   leaves the card stuck `generating` and the action lock blocks the next generation forever.
   → client + backend timeout that always settles to `failed (TIMEOUT)` and releases the lock,
   plus a Retry button. (1 + 2 = plan `phase-00-generation-failure-and-timeout.md`.)
3. **Passage-switch race.** `use-study-actions.ts:99-102` marks a valid generation `failed` when
   the active passage changed, discarding it. → keep it in its originating passage's cache.
4. **Tests.** Server-action persistence, generation failure/timeout, passage-switch race, and the
   quiz UI (keyboard / source quote / save-failure) — with a `NextIntlClientProvider` render helper.

## Where the work is tracked

`plans/260615-issue-69-study-quiz-flow/` — Phase 0 (priority: items 1+2), Phase 2 remainder (item 3),
Phase 3 (item 4). Phase 1 is superseded (the quiz-attempt route it targeted is gone).

## Update 2026-06-16 — implemented (items 1–4 done)

Design decision (user, supersedes plan Phase 0 "persist to DB"): generation failures are
**client-only + ephemeral**, NOT persisted as a structured DB column.

- **Failure reason**: `StudioArtifactErrorCode` (`studio-artifact-types.ts`) flows
  service → route `{ error, code }` → client → client state only. Shown as a localized card
  message (`studio-panel.tsx` `generationErrorMessage`). On reload the reason is gone (generic).
- **Failed artifact lifecycle = ephemeral delete.** On any generation failure the client keeps a
  transient failed card (reason + Retry) and **deletes** the DB row
  (`studioDeleteArtifactAction` → `deleteStudioArtifact`). The orphan reaper in
  `fetchStudioArtifacts` now **deletes** stuck `generating` rows instead of flipping to `failed`.
  Result: reload = clean slate, no dead "Failed" cards accumulate. `studioFailArtifactAction` /
  `failStudioArtifact` were removed (dead).
- **Timeout (progress-hell fix)**: client `AbortController` budget (`STUDIO_GENERATION_TIMEOUT_MS`,
  45s) in `postJson`/`patchJson` → `RequestTimeoutError` → client maps to `code: "TIMEOUT"`; the
  promise always settles so the action lock releases. Backend mirrors the budget with a
  `Promise.race` in `passage-study.service.ts`.
- **Retry**: `retryQuizArtifact` recreates the row under the **same id** (stable card) and regenerates.
- **Passage-switch race (Phase 2)**: fixed — a successful generation now completes into its
  originating passage's cache regardless of the active passage (no longer discarded as failed).
- Tests: `use-study-actions.test.ts` (errorCode/TIMEOUT/race/retry), `studio-artifacts-service.test.ts`
  (orphan delete), `quiz-content.test.tsx`, `quiz-results.test.tsx`, `studio-artifact-actions.test.ts`.
  Full suite green (353), typecheck + lint clean.

## ⚠️ Strange / wrong old implementations found (not all fixed — flagged per request)

1. **`render-with-intl` helper was unnecessary** (plan Phase 3 interview Q1 assumed no intl test
   infra). The repo **already** has a global `next-intl` mock in `tests/vitest/setup/vitest.setup.ts`
   that resolves real `en.json` messages, so component tests just use `render`/`renderWithUser`.
   Resolved: no helper created.
2. **`studio-panel.tsx` "Results" heading is hardcoded** (`<h3>Results</h3>`) instead of
   `t("results")` — the `results` i18n key already exists. Not fixed (out of scope, untranslated string).
3. **Double "Source" label in `quiz-content.tsx`** source quote: renders `t("source")` ("Source:")
   and, when a line exists, also `t("sourceLine")` ("Source (Line {n}):") → "Source: Source (Line 3):".
   Redundant. Not fixed (cosmetic, out of scope).
4. **`getOwnedPassage` 404 vs 502 mismatch**: `passage-study.service.ts` throws
   `PassageStudyServiceError("Passage not found")` for an ownership miss, but the studio-questions
   route maps every `PassageStudyServiceError` to **502** (its `isOwnershipMissError` check only
   inspects ZodErrors, not this class). So a not-owned/missing passage returns 502, while the plan's
   stated convention is 404. Pre-existing; not fixed (out of scope for this change).
