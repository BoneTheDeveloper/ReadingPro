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

An artifact moves through `generating → done` (success) or `generating → failed`
(error). The transition out of `generating` is driven **entirely by the client
that started the generation**:

1. Client calls `studioCreateArtifactAction` → row persisted with `status: "generating"`.
2. Client calls `POST /api/studio-questions` to run the AI generation.
3. On resolve, client calls `studioCompleteArtifactAction` (`done`). On failure the
   client marks the card `failed` in memory and calls `studioDeleteArtifactAction`,
   which removes the row (cascade drops any partial `questions`) — failures are
   ephemeral, so a reload shows a clean slate rather than a dead card.

## Orphaned Generation Recovery (Exception Flow)

**Problem.** If the client dies between steps 1 and 3 — tab/app closed, navigation
away, network drop, or crash mid-generation — steps 3 never runs. The row stays
`status: "generating"` permanently. On the next visit the studio panel locks the
quiz action (`isActionLocked("quiz")` is true for any `generating` quiz row, and
the row counts toward `maxConcurrent`), so the user can never start a new quiz for
that passage and sees a perpetual spinner. There is no server-side generation job
to recover the state, so the orphan never self-clears.

**Resolution.** `GET /api/studio-artifacts` (via `fetchStudioArtifacts`) reconciles
orphaned rows on read:

- Any row with `status: "generating"` whose age (`now - updatedAt`) exceeds
  `GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS` is considered orphaned.
- Orphaned rows are **deleted** (best-effort `deleteMany`, scoped by `userId` and
  `status: "generating"` to avoid racing a live job) and filtered out of the
  returned list — failures are ephemeral, so the orphan disappears on this read
  rather than lingering as a tombstone.
- The timeout is set well beyond the worst-case generation time so a genuinely
  in-flight job is never falsely reaped. A refetch only fires on passage switch or
  cache expiry, so it cannot interrupt the originating client's active request.

**Effect.** The action unlocks immediately, the orphaned artifact vanishes from the
list (the user can start a fresh quiz), and the recovery is durable across clients
and sessions because it lives at the read boundary.

| Status returned | Cause |
|-----------------|-------|
| `generating` | Generation actively in progress (within the orphan timeout). |
| `done` | Generation completed and questions persisted. |
| `failed` | Client reported failure (in-memory only; the row is deleted, not persisted as `failed`). |

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
- Service: `src/lib/study/passage/studio-artifacts-service.ts`
- Shared types: `src/lib/study/shared/studio-artifact-types.ts` (`GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS`)
- Client generation flow: `src/features/study/hooks/use-study-actions.ts`
- Lazy detail load: `studioLoadArtifactDetailAction` in `src/features/study/actions/studio-artifact-actions.ts`
- View wiring: `onSetViewingArtifact` → `handleViewArtifact` in `src/features/study/ui/study-workspace-client.tsx`
- Action lock logic: `src/features/study/ui/studio/studio-panel.tsx`
