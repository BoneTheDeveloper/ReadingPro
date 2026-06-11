# Study Questions API Feature

## Purpose

Generate and persist comprehension questions for a passage owned by the authenticated user.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/study-questions` | Generate a fresh quiz question set for a passage. |

## Auth And Ownership Rules

- Authenticated user-owned write.
- The route authenticates with `getAuthenticatedUser()`.
- Passage ownership is enforced by `generateQuestionsForPassage(user.id, passageId)`.
- Missing or unauthorized passages return `404` with the same external message.

## Request Contract

```ts
{
  passageId: string; // UUID
}
```

Malformed JSON returns `400`.

## Response Contract

Success:

```ts
{
  success: true;
  data: {
    questions: Array<{
      id: string;
      number: number;
      questionText: string;
      options: Array<{ id: string; text: string }>;
      correctAnswer: string;
      explanation: string;
      sourceText: string;
      sourceLine: number;
      questionType: string;
      difficulty: number;
    }>;
  };
}
```

Error:

```ts
{ error: string }
```

## Side Effects

- Uses the passage's simplified content when available; otherwise uses original content.
- Calls the configured AI question generator.
- Replaces existing persisted questions for the passage with the generated valid questions.

## Error Cases

| Status | Meaning |
|--------|---------|
| `400` | Malformed JSON or invalid request body. |
| `401` | Missing auth. |
| `404` | Passage not found or not owned by the user. |
| `502` | AI/service generation completed without a usable question set. |
| `500` | Unexpected generation failure. |

## Implementation References

- Route: `src/app/api/study-questions/route.ts`
- Service: `src/lib/study/passage/passage-study.service.ts`
- Shared schema: `src/lib/study/shared/study-response-schema.ts`
- Client API helper: `src/features/study/api/study-api.ts`

## Tests Or Verification Notes

- Contract tests: `tests/vitest/integration/api/study-questions-route.test.ts`
- Study page integration: `tests/vitest/integration/components/study/study-page-client.integration.test.tsx`
- Hook behavior: `src/features/study/model/use-study-actions.test.ts`
