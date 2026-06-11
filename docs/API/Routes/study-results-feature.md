# Study Results API Feature

## Purpose

Fetch study result artifacts (quiz/summary status) for passages owned by the authenticated user.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/study-results` | Fetch study result artifacts for a passage owned by the user. |

## Auth And Ownership Rules

- Authenticated user-owned read.
- The route authenticates with `getAuthenticatedUser()`.
- Passage ownership is enforced by `fetchStudyResults(user.id, passageId)`.
- Missing or unauthorized passages return `404` with the same external message.

## Request Contract

Query parameters:

```ts
{
  passageId: string; // UUID
}
```

Invalid or missing passageId returns `400`.

## Response Contract

Success:

```ts
{
  success: true;
  data: {
    results: Array<{
      id: string;
      type: "quiz" | "summary" | string;
      passageId: string;
      title: string;
      status: "completed" | "running" | "error";
      createdAt: string; // ISO
    }>;
  };
}
```

Returns quiz result if questions exist for passage, summary result if simplifiedContent exists.

Error:

```ts
{ error: string }
```

## Side Effects

- Queries for existing quiz and summary results in the database.
- Returns aggregated results based on available artifacts.
- No database writes or modifications.

## Error Cases

| Status | Meaning |
|--------|---------|
| `400` | Invalid passageId or missing required query parameter. |
| `401` | Missing auth. |
| `404` | Passage not found or not owned by the user. |
| `500` | Unexpected database query error. |

## Implementation References

- Route: `src/app/api/study-results/route.ts`
- Service: `src/lib/study/passage/study-results-service.ts`
- Types: `src/lib/study/shared/study-artifact-types.ts` (StudioResult)

## Tests Or Verification Notes

- No dedicated test file yet
