# Study Artifacts API Feature

## Purpose

Fetch list of generated artifacts (quizzes, etc.) for a specific passage owned by the authenticated user.

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/study-artifacts` | List all artifacts for a passage. |

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

## Implementation References

- Route: `src/app/api/study-artifacts/route.ts`
- Service: `src/lib/study/passage/studio-artifacts-service.ts`
- Shared types: `src/lib/study/shared/studio-artifact-types.ts`
