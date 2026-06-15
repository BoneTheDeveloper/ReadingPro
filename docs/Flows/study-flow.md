# Study Flow

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
| Upload from study modal | `src/features/study/actions/study-upload-action.ts` |
| Simplify active passage | `src/features/study/actions/study-simplify-action.ts` |
| Generate questions | `src/features/study/actions/study-generate-questions-action.ts` |
| Delete passage | `src/features/study/actions/study-delete-passage-action.ts` |

## State

Client workspace state is managed by:

- `src/features/study/model/use-study-workspace-state.ts`
- `src/features/study/model/use-study-panel-layout.ts`
- `src/features/study/model/use-study-actions.ts`

## Data Rules

- Passages must be filtered by authenticated `userId`.
- Deleted passages use `deletedAt`.
- Generated questions are associated with `Passage`.
- Study activity is tracked through `StudySession` windows and child
  `QuizAttempt` records.
