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
