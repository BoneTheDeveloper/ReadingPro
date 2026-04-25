# Phase 2: Client Hooks

## Context
Refactor `src/features/studio/client/query/artifact.ts` to use fetch + useMutation instead of server actions.

## Steps

### 2.1 Update query hooks
- `useArtifactList(passageId)` - calls `GET /api/artifact?passageId=`
- `useArtifact(artifactId)` - calls `GET /api/artifact/[id]`

### 2.2 Update mutation hooks
- `useGenerateQuestion()` - calls `POST /api/artifact/question`
- `useRecordProgress()` - calls `PATCH /api/artifact/[id]/progress`
- `useDeleteArtifact()` - calls `DELETE /api/artifact/[id]`

### 2.3 Update query keys
```typescript
const artifactKeys = {
  all: ["artifacts"] as const,
  list: (passageId: string) => ["artifacts", "list", passageId] as const,
  detail: (artifactId: string) => ["artifacts", artifactId] as const,  // was: [..., "question"]
};
```

### 2.4 Update cache invalidation
- On create: invalidate list, set detail cache
- On delete: invalidate list
- On progress update: invalidate list

## Files
- `src/features/studio/client/query/artifact.ts`

## Validation
- TypeScript compiles
- No `"use server"` imports remain
