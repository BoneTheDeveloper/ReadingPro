---
phase: 2
title: "Add GET /api/study-results aggregate metadata endpoint"
status: pending
priority: P1
effort: "1h"
dependencies: [1]
---

# Phase 2: Add GET /api/study-results aggregate metadata endpoint

## Overview

Create `GET /api/study-results?passageId=...` that returns `StudioResult[]` metadata by aggregating from concrete DB tables. This allows the frontend to reconstruct the Results panel after refresh and populate the passage-scoped cache.

## Requirements

- Return metadata only — no full question content, no full summary text
- Aggregate from: `Question` table → type "quiz", `Passage.simplifiedContent` → type "summary"
- Authenticated — user must own the passage
- Validate `passageId` query param with Zod

## Architecture

```
GET /api/study-results?passageId=uuid

Response:
{
  results: [
    {
      id: "quiz:{passageId}",
      type: "quiz",
      passageId: "...",
      title: "Quiz",
      status: "completed",
      createdAt: "2026-06-10T10:00:00.000Z"
    },
    {
      id: "summary:{passageId}",
      type: "summary",
      passageId: "...",
      title: "Summary",
      status: "completed",
      createdAt: "2026-06-10T09:30:00.000Z"
    }
  ]
}
```

Mapping logic:
- **Quiz**: `SELECT createdAt FROM questions WHERE passageId = ? LIMIT 1` → if exists, return one "quiz" result with `id: "quiz:{passageId}"`
- **Summary**: Check `Passage.simplifiedContent IS NOT NULL` → if yes, return one "summary" result with `id: "summary:{passageId}"`, use `Passage.updatedAt` as `createdAt`
- Chat, flashcard, mindmap: skip for MVP (no concrete tables yet)

## Related Code Files

- Create: `src/app/api/study-results/route.ts`
- Read: `prisma/schema.prisma` (Question, Passage models)
- Read: `src/features/study/actions/study-shared.ts` (getAuthenticatedUser)

## Implementation Steps

1. Create `src/app/api/study-results/route.ts`
2. Validate `passageId` query param with Zod (uuid string)
3. Authenticate user via `getAuthenticatedUser()`
4. Query: check if passage belongs to user and is not deleted
5. Query: `db.question.findFirst({ where: { passageId }, select: { createdAt: true } })` for quiz existence
6. Read: passage already fetched in step 4 — check `simplifiedContent` for summary existence
7. Build `StudioResult[]` array from query results
8. Return `{ results }` with 200
9. Handle errors: 401 unauthenticated, 400 bad input, 404 passage not found

## Success Criteria

- [ ] `GET /api/study-results?passageId=X` returns quiz result when questions exist
- [ ] Returns summary result when passage has `simplifiedContent`
- [ ] Returns empty array when neither exist
- [ ] Returns 401 without auth
- [ ] Returns 400 without passageId
- [ ] Returns 404 for passages not owned by user

## Risk Assessment

Low risk. Read-only endpoint, no mutations. Reuses existing auth pattern from `study-shared.ts`.
