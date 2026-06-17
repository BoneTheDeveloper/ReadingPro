# Study Artifacts API

Part of the **Study** domain. See [Study domain index](../README.md).

## Purpose

Fetch generated artifacts (quizzes, etc.) for a passage owned by the
authenticated user, and manage a quiz's attempt result.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/study/studio/artifacts` | List all artifacts for a passage. |
| `GET` | `/api/study/studio/artifacts/[id]` | Fetch a single artifact (with detail). |
| `POST` | `/api/study/studio/artifacts/[id]/quiz-result` | Record a quiz attempt result. |
| `DELETE` | `/api/study/studio/artifacts/[id]/quiz-result` | Reset (delete) a quiz result for retry. |

## Auth And Ownership

- Authenticated user-owned read/write.
- The route authenticates with `getAuthenticatedUser()`.
- Passage ownership is enforced by the query.

## List Artifacts

`GET /api/study/studio/artifacts?passageId=<uuid>`

### Success response

```ts
{
  success: true;
  data: {
    artifacts: Array<{
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
    }>;
  };
}
```

### Error cases

```ts
{ error: string }
```

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
2. Client calls `POST /api/study/studio/questions` with `{ passageId, artifactId }`.
3. The server runs the LLM, then in a **single DB transaction** creates the
   `StudioArtifact` row (`status: "done"`) + all `Question` rows together.
4. On success the route returns `{ artifact, questions }`. The client replaces the
   optimistic card with the server artifact and caches the questions.
5. On failure (LLM error, timeout, validation) the transaction never runs — nothing
   is persisted. The client card transitions to `failed` in memory only (ephemeral;
   gone on reload). Retry re-POSTs under the same `artifactId`.

**Interrupt safety.** If the app closes mid-generation:
- If the server committed: the quiz appears as `done` on next reload (the client
  finds it from `GET /api/study/studio/artifacts`).
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

`GET /api/study/studio/artifacts` returns artifact **metadata only** — it never embeds
the persisted quiz questions. The question rows are loaded separately, on demand,
the first time an artifact is opened. This keeps the list response small and
avoids fetching question sets the user may never open.

The detail load is driven by the client view flow, not a route:

1. Generation success only: questions returned by `POST /api/study/studio/questions` are
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
2. **Finished:** Once the user completes the quiz, the client calls `studioRecordQuizResultAction` (`POST /api/study/studio/artifacts/[id]/quiz-result`) which upserts the `QuizResult` row with the final score.
3. **Retry:** If the user wants to retry the quiz, the client calls `studioResetQuizResultAction` (`DELETE /api/study/studio/artifacts/[id]/quiz-result`) to delete the `QuizResult` row, reverting the artifact to the "Not Attempted" state.

## Observability

- List route logger / Sentry route tag: `api:study:studio:artifacts`
- Detail route logger: `api:study:studio:artifacts:detail`
- Quiz-result route logger: `api:study:studio:artifacts:quiz-result`
- Logged request paths: `GET /api/study/studio/artifacts`, `GET /api/study/studio/artifacts/[id]`, `POST|DELETE /api/study/studio/artifacts/[id]/quiz-result`

## Implementation References

- Routes: `src/app/api/study/studio/artifacts/route.ts`, `src/app/api/study/studio/artifacts/[id]/route.ts`, `src/app/api/study/studio/artifacts/[id]/quiz-result/route.ts`
- Service: `src/server/modules/study/passage/studio-artifacts-service.ts`
- Shared types: `src/contracts/study/studio-artifact-types.ts`
- Client generation flow: `src/features/study/hooks/use-study-actions.ts`
- Artifact client: `src/features/study/api-client/studio-artifacts-client.ts`
- Lazy detail load: `studioLoadArtifactDetailAction` in `src/features/study/actions/studio-artifact-actions.ts`
- View wiring: `onSetViewingArtifact` → `handleViewArtifact` in `src/features/study/ui/study-workspace-client.tsx`
- Action lock logic: `src/features/study/ui/studio/studio-panel.tsx`
