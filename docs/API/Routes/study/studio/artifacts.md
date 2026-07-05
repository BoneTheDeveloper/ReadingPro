# Study Artifacts

## Purpose

Fetch generated artifacts (quizzes, etc.) for a passage owned by the authenticated user, and manage a quiz's attempt result.

## Server Actions

| Action | File | Purpose |
|--------|------|---------|
| `getStudioArtifactsAction(passageId)` | `src/features/studio-panel/actions.ts` | List all artifacts for a passage. |
| `getArtifactQuestionsAction(artifactId)` | `src/features/studio-panel/actions.ts` | Fetch questions for a quiz artifact. |
| `recordQuizResultAction(artifactId, stats)` | `src/features/studio-panel/actions.ts` | Record a quiz attempt result. |
| `resetQuizResultAction(artifactId)` | `src/features/studio-panel/actions.ts` | Reset (delete) a quiz result for retry. |

## Auth And Ownership

- Authenticated user-owned read/write.
- Each action authenticates with `getUserId()`.
- Passage ownership is enforced by the query.

## getStudioArtifactsAction

Fetch all artifacts for a passage.

**Signature:**
```ts
async function getStudioArtifactsAction(passageId: string)
```

**Return type:**
```ts
{ artifacts: Array<{
  id: string;
  type: "quiz" | "flashcard";
  passageId: string;
  title: string;
  status: "generating" | "done" | "failed";
  createdAt: string; // ISO
  updatedAt: string; // ISO
  quizResult?: {
    completedAt: string;   // ISO
    correctCount: number;
    totalQuestions: number;
    accuracyRate: number;
  };
}> }
```

**Authentication:** Requires authenticated user. Returns only artifacts owned by the user.

**Errors:** Throws if `passageId` is invalid or user does not own the passage.

## Artifact Lifecycle

The DB only ever holds **completed** (`done`) artifacts. `generating` and `failed`
are **in-memory client states only** — no persisted row ever carries these statuses.

1. Client generates a UUID (`artifactId`) and adds an optimistic `generating` card
   in memory.
2. Client calls `POST /api/studio/questions` with `{ passageId, artifactId }`.
3. The server runs the LLM, then in a **single DB transaction** creates the
   `StudioArtifact` row (`status: "done"`) + all `Question` rows together.
4. On success the route returns `{ artifact, questions }`. The client replaces the
   optimistic card with the server artifact and caches the questions.
5. On failure (LLM error, timeout, validation) the transaction never runs — nothing
   is persisted. The client card transitions to `failed` in memory only (ephemeral;
   gone on reload). Retry re-POSTs under the same `artifactId`.

**Interrupt safety.** If the app closes mid-generation:
- If the server committed: the quiz appears as `done` on next reload (the client
  finds it via `getStudioArtifactsAction`).
- If the server did not commit (or the request never reached it): nothing is in the
  DB. The reload shows no card, and the user can re-click Quiz.

In both cases the DB is consistent; no orphan-recovery or background reconciler is
needed.

| Status returned | Cause |
|-----------------|-------|
| `done` | Generation committed atomically. |
| `generating` | In-memory only — active request in the current session. |
| `failed` | In-memory only — transient error; gone after reload. |

## Question Loading Strategy (Lazy Detail)

`getStudioArtifactsAction` returns artifact **metadata only** — it never embeds
the persisted quiz questions. The question rows are loaded separately, on demand,
the first time an artifact is opened. This keeps the list response small and
avoids fetching question sets the user may never open.

The detail load is driven by the client view flow, not a route:

1. Generation success only: questions returned by `POST /api/studio/questions` are
   placed straight into the in-memory detail cache (`artifactDetailById`). No
   detail fetch is needed for the artifact just generated in this session.
2. After a page reload (or when switching back to a passage), the in-memory cache
   is empty — `getStudioArtifactsAction` repopulates artifact metadata but not questions.
3. Opening an artifact calls `handleViewArtifact`, which lazy-loads the detail via
   `getArtifactQuestionsAction` **only when** `artifactDetailById[id]` is
   missing. For `type: "quiz"` the action queries persisted `questions` by
   `artifactId` and returns them; the result is cached in `artifactDetailById` so
   subsequent opens are instant.

**Invariant.** The view handler (`onSetViewingArtifact`) MUST route through
`handleViewArtifact` rather than only setting the viewing ref — otherwise a
reloaded artifact opens with no questions in cache and nothing to render, because
the only path that fetches persisted questions is skipped.

## getArtifactQuestionsAction

Fetch questions for a quiz artifact by ID.

**Signature:**
```ts
async function getArtifactQuestionsAction(artifactId: string)
```

**Authentication:** Requires authenticated user. Enforced via ownership check in service layer.

## recordQuizResultAction

Record or update a quiz attempt result.

**Signature:**
```ts
async function recordQuizResultAction(artifactId: string, stats: { correctCount: number; totalQuestions: number })
```

**Side effects:** Upserts the `QuizResult` row. Computes `accuracyRate` as `(correctCount / totalQuestions)`.

## resetQuizResultAction

Delete a quiz result to allow retry.

**Signature:**
```ts
async function resetQuizResultAction(artifactId: string)
```

**Side effects:** Deletes the `QuizResult` row, reverting the artifact to "Not Attempted" state.

## Quiz Attempt and Result Lifecycle

A quiz artifact tracks user attempts via the 1:1 `QuizResult` child.

1. **Not Attempted:** When an artifact is `done` but has no `quizResult`, it represents a fresh quiz.
2. **Finished:** User completes quiz → call `recordQuizResultAction` → upserts `QuizResult` row with final score.
3. **Retry:** User wants to retry → call `resetQuizResultAction` → deletes `QuizResult` row, reverts to "Not Attempted" state.

## Implementation References

- Server Actions: `src/features/studio-panel/actions.ts`
- Service layer: `src/server/modules/passage/studio-artifacts-service.ts`
- Shared types: `src/contracts/study/studio-artifact-types.ts`
- Artifact list hook: `src/features/studio-panel/hooks/use-study-artifacts.ts`
- Quiz results component: `src/features/studio-panel/ui/studio/quiz/quiz-results.tsx`
- Chat panel (history via action): `src/features/studio-panel/ui/studio/chat/chat-panel.tsx`
