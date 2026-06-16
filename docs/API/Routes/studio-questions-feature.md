# Studio Questions API Feature

## Purpose

Generate and persist comprehension questions for a passage owned by the authenticated user.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/studio-questions` | Generate a fresh quiz question set for a passage. |

## Auth And Ownership Rules

- Authenticated user-owned write.
- The route authenticates with `getAuthenticatedUser()`.
- Passage ownership is enforced by `generateQuestionsForPassage(user.id, passageId)`.
- Missing or unauthorized passages return `404` with the same external message.

## Request Contract

```ts
{
  passageId: string; // UUID
  artifactId: string; // UUID
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
- Persists generated valid questions associated with the provided `artifactId`.
- Does NOT replace existing questions for the passage; allows multiple artifact-scoped question sets.

## Error Cases

| Status | Meaning |
|--------|---------|
| `400` | Malformed JSON or invalid request body. |
| `401` | Missing auth. |
| `404` | Passage not found or not owned by the user. |
| `502` | AI/service generation completed without a usable question set. |
| `500` | Unexpected generation failure. |

## Implementation References

- Route: `src/app/api/studio-questions/route.ts`
- Service: `src/lib/study/passage/passage-study.service.ts`
- Shared schema: `src/lib/study/shared/study-response-schema.ts`
- Client API helper: `src/features/study/api/studio-questions-client.ts`

## Tests Or Verification Notes

- Contract tests: `tests/vitest/integration/api/studio-questions-route.test.ts`
- Study page integration: `tests/vitest/integration/components/study/study-page-client.integration.test.tsx`
- Hook behavior: `src/features/study/hooks/use-study-actions.test.ts`
