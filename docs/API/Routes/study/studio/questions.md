# Study Questions API

## Purpose

Generate and persist comprehension questions for a passage owned by the
authenticated user.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/study/studio/questions` | Generate a fresh quiz question set for a passage. |

## Auth And Ownership

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
    artifact: {
      id: string;
      type: "quiz" | "flashcard";
      passageId: string;
      title: string;
      status: "done";          // always "done" — atomic commit or nothing
      createdAt: string;       // ISO
      updatedAt: string;       // ISO
    };
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

- Uses the passage's simplified content when available; otherwise uses original.
- Calls the configured AI question generator (outside the DB transaction).
- **Atomic commit:** on success, creates the `StudioArtifact` row (`status: "done"`)
  and all `Question` rows in a single `$transaction`. On any failure, nothing is
  persisted.
- **Idempotent on `artifactId`:** if a row with that id already exists and belongs
  to the authenticated user, the existing artifact + questions are returned without
  re-generating. Safe for retries and double-submits.
- Returned questions are cached client-side for the originating session. On a later
  reload they are reloaded lazily — see "Question Loading Strategy (Lazy Detail)" in
  [Study artifacts API](artifacts.md).

## Error Cases

| Status | Meaning |
|--------|---------|
| `400` | Malformed JSON or invalid request body. |
| `401` | Missing auth. |
| `404` | Passage not found or not owned by the user. |
| `502` | AI/service generation completed without a usable question set. |
| `500` | Unexpected generation failure. |

## Observability

- Request logger / Sentry route tag: `api:study:studio:questions`
- Spans: `api:study:studio:questions-parse-body`, `api:study:studio:questions-authenticate`
- Logged request path: `POST /api/study/studio/questions`

## Implementation References

- Route: `src/app/api/study/studio/questions/route.ts`
- Service: `src/server/modules/study/passage/passage-study.service.ts`
- Shared schema: `src/contracts/study/study-response-schema.ts`
- Client API helper: `src/features/study/api-client/studio-questions-client.ts`

## Tests Or Verification Notes

- Contract tests: `tests/vitest/integration/api/studio-questions-route.test.ts`
- Study page integration: `tests/vitest/integration/components/study/study-page-client.integration.test.tsx`
- Hook behavior: `src/features/study/hooks/use-study-actions.test.ts`
