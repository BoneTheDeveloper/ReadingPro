# Studio Artifacts API Feature

## Purpose

Fetch list of generated artifacts (quizzes, etc.) for a specific passage owned by the authenticated user.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/studio-artifacts` | List all artifacts for a passage. |

## Auth And Ownership Rules

- Authenticated user-owned read.
- The route authenticates with `getAuthenticatedUser()`.
- Passage ownership check is performed implicitly or explicitly by the query.

## Request Contract

Query Parameters:

| Name | Type | Purpose |
|------|------|---------|
| `passageId` | UUID | The passage to fetch artifacts for. |

## Response Contract

Success:

```ts
{
  success: true,
  data: {
    artifacts: Array<{
      id: string;
      type: "quiz" | "flashcard";
      passageId: string;
      title: string;
      status: "generating" | "done" | "failed";
      createdAt: string; // ISO Date
      updatedAt: string; // ISO Date
      quizResult?: {
        completedAt: string; // ISO Date
        correctCount: number;
        totalQuestions: number;
        accuracyRate: number;
      };
    }>
  }
}
```

Error:

```ts
{ error: string }
```

## Error Cases

| Status | Meaning |
|--------|---------|
| `400` | Invalid or missing `passageId`. |
| `401` | Missing auth. |
| `404` | Passage not found or not owned by the user. |
| `500` | Unexpected database failure. |

## Artifact Lifecycle

The DB only ever holds **completed** (`done`) artifacts. `generating` and `failed`
are **in-memory client states only** — no persisted row ever carries these statuses.

1. Client generates a UUID (`artifactId`) and adds an optimistic `generating` card
   in memory.
2. Client calls `POST /api/studio-questions` with `{ passageId, artifactId }`.
3. The server runs the LLM, then in a **single DB transaction** creates the
   `StudioArtifact` row (`status: "done"`) + all `Question` rows together.
4. On success the route returns `{ artifact, questions }`. The client replaces the
   optimistic card with the server artifact and caches the questions.
5. On failure (LLM error, timeout, validation) the transaction never runs — nothing
   is persisted. The client card transitions to `failed` in memory only (ephemeral;
   gone on reload). Retry re-POSTs under the same `artifactId`.

**Interrupt safety.** If the app closes mid-generation:
- If the server committed: the quiz appears as `done` on next reload (the client
  finds it from `GET /api/studio-artifacts`).
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

`GET /api/studio-artifacts` returns artifact **metadata only** — it never embeds
the persisted quiz questions. The question rows are loaded separately, on demand,
the first time an artifact is opened. This keeps the list response small and
avoids fetching question sets the user may never open.

The detail load is driven by the client view flow, not a route:

1. Generation success only: questions returned by `POST /api/studio-questions` are
   placed straight into the in-memory detail cache (`artifactDetailById`). No
   detail fetch is needed for the artifact just generated in this session.
2. After a page reload (or when switching back to a passage), the in-memory cache
   is empty — the list endpoint repopulates artifact metadata but not questions.
3. Opening an artifact calls `handleViewArtifact`, which lazy-loads the detail via
   `studioLoadArtifactDetailAction` **only when** `artifactDetailById[id]` is
   missing. For `type: "quiz"` the action queries persisted `questions` by
   `artifactId` and returns them; the result is cached in `artifactDetailById` so
   subsequent opens are instant.

**Invariant.** The view handler (`onSetViewingArtifact`) MUST route through
`handleViewArtifact` rather than only setting the viewing ref — otherwise a
reloaded artifact opens with no questions in cache and nothing to render, because
the only path that fetches persisted questions is skipped.

## Quiz Attempt and Result Lifecycle

A quiz artifact also tracks user attempts via the 1:1 `QuizResult` child.

1. **Not Attempted:** When an artifact is `done` but has no `quizResult`, it represents a fresh quiz.
2. **Finished:** Once the user completes the quiz, the client calls `studioRecordQuizResultAction` which upserts the `QuizResult` row with the final score.
3. **Retry:** If the user wants to retry the quiz, the client calls `studioResetQuizResultAction` to delete the `QuizResult` row, reverting the artifact to the "Not Attempted" state.

## Implementation References

- Route: `src/app/api/studio-artifacts/route.ts`
- Service: `src/server/modules/study/passage/studio-artifacts-service.ts`
- Shared types: `src/contracts/study/studio-artifact-types.ts`
- Client generation flow: `src/features/study/hooks/use-study-actions.ts`
- Lazy detail load: `studioLoadArtifactDetailAction` in `src/features/study/actions/studio-artifact-actions.ts`
- View wiring: `onSetViewingArtifact` → `handleViewArtifact` in `src/features/study/ui/study-workspace-client.tsx`
- Action lock logic: `src/features/study/ui/studio/studio-panel.tsx`
