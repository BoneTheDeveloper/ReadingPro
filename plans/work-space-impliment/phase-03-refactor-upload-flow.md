---
phase: 3
title: "Refactor upload flow"
status: pending
priority: P2
effort: "3h"
dependencies: ["phase-02-rsc-passage-service"]
---

# Phase 3: Refactor upload flow

## Overview

Refactor the upload flow so the client creates the passage in DB before blob upload, and Inngest cleans up on failure.

## Context Links

- Related: `src/features/upload/server/actions/upload.ts`
- Related: `src/features/upload/server/inngest/handle-upload-event.ts`
- Related: `src/features/passage/server/services/passage.ts`
- Related: `src/app/[locale]/(dashboard)/study/_hooks/use-study-workspace.ts`

## Requirements

- Functional: Client creates passage before blob upload; Inngest deletes blob on failure; passage service used for all passage mutations
- Non-functional: No orphaned blobs or passages on failure

## Architecture

### New Upload Flow

```
1. Client (via useStudyWorkspaceState):
   - createPassage({ id, title, status: "processing" }) via passage service
   - Adds temp passage to state

2. Client action (uploadFileAction):
   - Validates file
   - Creates UploadJob in DB
   - Uploads file to blob storage
   - If blob upload fails → delete passage from DB via passage service
   - Sends Inngest event with { passageId, jobId, blobPath, ... }

3. Inngest (handle-upload-event.ts):
   - Analyze content → update passage { status: "ready", content, wordCount, cefrLevel }
   - On failure → delete passage from DB + delete blob via deleteFile(blobPath)

4. Client (getUploadStatus polling or callback):
   - DONE → replace temp with real passage
   - FAILED → remove temp from state (already deleted from DB)
```

### Changes Required

1. **Add `createPassage` to passage service:**
   ```ts
   // src/features/passage/server/services/passage.ts
   export async function createPassage(userId: string, data: PassageData): Promise<PassageData>
   ```

2. **Add `deletePassage` to passage service:**
   ```ts
   // src/features/passage/server/services/passage.ts
   export async function deletePassageById(passageId: string, userId: string): Promise<void>
   ```

3. **Modify `uploadFileAction`:**
   - Accept `passageId` from client (already does)
   - On blob upload failure, call `deletePassage` service before returning error
   - Pass `blobPath` to Inngest event (already done)

4. **Modify `handle-upload-event.ts`:**
   - On any failure, call `deleteFile(blobPath)` to clean up orphaned blob
   - Update job status to FAILED instead of throwing (so cleanup always runs)

5. **Modify `use-study-workspace.ts`:**
   - `handleUploadStart` calls `createPassage` via passage service before showing temp
   - `handleUploadComplete` replaces temp with real passage
   - `handleUploadError` removes temp from state

## Related Code Files

- **Modify:** `src/features/passage/server/services/passage.ts` — add `createPassage`, ensure `deletePassage` works
- **Modify:** `src/features/passage/index.ts` — export new functions
- **Modify:** `src/features/upload/server/actions/upload.ts` — call `deletePassage` on blob failure
- **Modify:** `src/features/upload/server/inngest/handle-upload-event.ts` — delete blob on failure
- **Modify:** `src/app/[locale]/(dashboard)/study/_hooks/use-study-workspace.ts` — call `createPassage` service

## Implementation Steps

1. Add `createPassage` to passage service:
   ```ts
   export async function createPassage(userId: string, data: Omit<PassageData, "createdAt" | "status">): Promise<PassageData>
   ```
2. Verify `deletePassage` already deletes from DB (it does via Prisma cascade or explicit delete)
3. Modify `uploadFileAction`:
   - On blob failure: await `deletePassage(passageId, userId)` before returning error
4. Modify `handle-upload-event.ts`:
   - Add blob cleanup: `await deleteFile(blobPath)` in catch block
   - Ensure passage deletion on failure
5. Modify `use-study-workspace.ts`:
   - `handleUploadStart` → call `createPassage` server action before showing temp
6. Verify `pnpm typecheck`

## Success Criteria

- [ ] Client creates passage before blob upload
- [ ] Blob upload failure cleans up passage from DB
- [ ] Inngest failure cleans up blob + passage from DB
- [ ] `pnpm typecheck` passes
- [ ] No orphaned blobs or passages on any failure path

## Risk Assessment

- **Risk:** Medium — changes upload action + Inngest + passage service + workspace hook
- **Mitigation:** Test each failure path manually: blob fail, Inngest fail, success path
