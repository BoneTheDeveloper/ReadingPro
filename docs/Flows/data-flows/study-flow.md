# Study Data Flow

## Flow

```text
Learner opens /[locale]/study
  -> server loads authenticated user data
  -> client ensures active study session window
  -> study client renders three-panel workspace
  -> left panel selects passages/tools
  -> content panel renders original/simplified passage
  -> right panel opens quiz, translation, chat, or results views
```

## Actions

| Action | File |
|--------|------|
| Upload from study modal | `src/features/upload/actions/create-uploaded-passage-action.ts` or study-specific flow |
| Generate quiz questions | `POST /api/studio/questions` via `src/features/studio-panel/api-client/studio-questions-client.ts` |
| List artifacts | `src/features/studio-panel/actions.ts` → `getStudioArtifactsAction` |
| Fetch artifact questions | `src/features/studio-panel/actions.ts` → `getArtifactQuestionsAction` |
| Record quiz result | `src/features/studio-panel/actions.ts` → `recordQuizResultAction` |
| Reset quiz result | `src/features/studio-panel/actions.ts` → `resetQuizResultAction` |
| Get chat history | `src/features/studio-panel/actions.ts` → `getChatHistoryAction` |
| Delete passage | `src/features/study-workspace/actions.ts` → `deletePassageAction` |
| Save vocabulary | `src/features/study-workspace/actions.ts` → `saveVocabularyAction` |

## Original/Simplified Toggle

`StudyContentPanel` displays simplified content when available (auto-generated during upload):

- The **Original/Simplified** toggle renders only when `passage.simplifiedContent` exists.
- User switches between versions; the display updates immediately.
- Simplified content is generated automatically during upload for levels B1+.
- The CEFR badge and word count are shown in the meta bar.

## State

Client workspace state is managed by:

- `src/features/study-workspace/hooks/use-study-workspace-state.ts`
- `src/features/study-workspace/hooks/use-study-panel-layout.ts`
- `src/features/studio-panel/hooks/use-study-artifacts.ts` (artifact list, caching)
- `src/features/learning-session/hooks/use-learning-session-heartbeat.ts` (session tracking)

## Quiz Generation Reliability

A quiz is a `StudioArtifact` whose `status` is `generating` -> `done` | `failed`.

- **Optimistic create.** Clicking Quiz creates the artifact row (`generating`) so an
  in-flight generation survives reload as a spinner. The studio action is locked while
  any quiz artifact is `generating`.
- **Timeout.** Generation is bounded by `STUDIO_GENERATION_TIMEOUT_MS` (45s) on both
  sides: the client uses an `AbortController` in `postJson` (primary fix — always settles
  the request so the action lock releases), and `passage-study.service.ts` races the LLM
  call with the same budget. A timeout surfaces as error code `TIMEOUT`.
- **Failure reason is client-only.** Failures carry a shared `StudioArtifactErrorCode`
  (`src/contracts/study/studio-artifact-types.ts`) returned as `{ error, code }` and shown
  as a localized card message. It is **not** persisted — the reason is gone after reload by design.
- **Atomic generation.** `POST /api/studio/questions` creates the `StudioArtifact`
  (`status: "done"`) + its `Question` rows in a single DB transaction. On any failure
  nothing is persisted. The DB only ever holds completed quizzes.
- **Failures are in-memory only.** A failed generation leaves no DB row. The client
  keeps a transient failed card with a Retry button; it is gone after reload. Net:
  reload shows only `done` artifacts (never `generating` or `failed` from the DB).
- **Interrupt safety.** If the app closes mid-generation: if the server committed,
  the quiz appears `done` on reload; if not, nothing is in the DB and the user can
  re-click Quiz. No orphan-recovery or reaper needed.
- **Retry** re-POSTs under the same `artifactId` (guarded against re-entrant
  double-fire). The server's idempotency guard returns the existing quiz if the
  first attempt actually committed.
- **Passage-switch race.** A generation that completes after the user switched passages is
  kept on its originating passage's cache (not discarded).

## Data Rules

- Passages must be filtered by authenticated `userId`.
- Deleted passages use `deletedAt`.
- Generated questions are associated with `Passage` and the parent quiz `StudioArtifact`
  (cascade-deleted with the artifact).
- Study presence is tracked through `StudySession` heartbeat windows; quiz outcomes
  persist as a `QuizResult` (1:1 with the quiz `StudioArtifact`).
