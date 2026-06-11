# Quiz Attempt API Feature

## Purpose

Create and complete quiz attempts for study sessions, tracking completion status and scoring metrics.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/quiz-attempt` | Create a quiz attempt tied to a study session. |
| `PATCH` | `/api/quiz-attempt` | Complete a quiz attempt with score counts. |

## Auth And Ownership Rules

- Authenticated user-owned write.
- The route authenticates with `getAuthenticatedUser()`.
- Study session ownership is enforced by service layer validation.
- Missing or unauthorized sessions return appropriate error responses.

## Request Contract

### POST /api/quiz-attempt

```ts
{
  studySessionId: string; // UUID
  passageId?: string; // UUID (nullable)
}
```

### PATCH /api/quiz-attempt

```ts
{
  attemptId: string; // UUID
  correctCount: number; // int, non-negative
  incorrectCount: number; // int, non-negative
  totalQuestions: number; // int, positive
}
```

Malformed JSON returns `400`.

## Response Contract

Success:

```ts
{
  success: true;
  data: {
    id: string;
    studySessionId: string;
    passageId: string | null;
    correctCount: number;
    incorrectCount: number;
    totalQuestions: number;
    accuracyRate: number | null;
    startedAt: string; // ISO
    completedAt: string | null; // ISO (nullable)
  };
}
```

Error:

```ts
{ error: string }
```

## Side Effects

- Creates or updates quiz attempt records in the database.
- Validates that correctCount + incorrectCount === totalQuestions.
- Updates attempt completion status and scoring metrics.
- Tracks timing data for performance analysis.

## Error Cases

| Status | Meaning |
|--------|---------|
| `400` | Malformed JSON or invalid request body/validation. |
| `401` | Missing auth. |
| `404` | Study session not found or not owned by the user. |
| `500` | Unexpected database or processing error. |

## Implementation References

- Route: `src/app/api/quiz-attempt/route.ts`
- Service: `src/lib/db/quiz-attempt-queries.ts`
- Shared schema: `src/lib/study/shared/study-response-schema.ts`
- DTO: `toQuizAttemptDto` from `src/lib/study/shared/study-response-schema.ts`

## Tests Or Verification Notes

- Contract tests: `tests/vitest/integration/api/routes.test.ts`
- Service layer tests: `tests/vitest/integration/services/passage-study-service.test.ts`