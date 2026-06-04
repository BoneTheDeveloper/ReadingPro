---
phase: 5
title: "Private Vercel Blob Storage"
status: pending
priority: P1
effort: "5h"
dependencies: [4]
---

# Phase 5: Private Vercel Blob Storage

## Overview

Replace Supabase Storage with a server-only private Vercel Blob adapter. Store
blob pathnames in passages, expose files only through authenticated
ownership-checked application routes, and make upload/user-deletion cleanup
idempotent.

## Context Links

- [Plan](./plan.md)
- [Current storage adapter](../../../src/lib/storage/supabase-storage.ts)
- [Upload workflow](../../../src/features/upload/upload-workflow.ts)
- [Upload route](../../../src/app/api/upload/route.ts)
- [Vercel Blob private storage](https://vercel.com/docs/vercel-blob/private-storage)

## Requirements

- Functional:
  - Server uploads validated PDF/text files to private Blob storage.
  - `Passage.filePath` stores pathname; no public/private provider URL is stored.
  - Public upload responses do not expose private Blob URLs or tokens.
  - Authorized file route verifies Clerk user and passage ownership before streaming.
  - Failed analysis/persistence deletes uploaded blob.
  - Clerk user deletion removes owned blobs before cascading DB deletion.
- Non-functional:
  - Storage adapter remains provider-contained and server-only.
  - Cleanup is retryable/idempotent.
  - Existing validation, parsing, and upload limits remain.

## Architecture

```text
POST /api/upload
  -> Clerk auth userId
  -> validate + sanitize
  -> private Blob put(users/{userId}/passages/{uuid}-{name})
  -> parse/analyze
  -> save Passage.filePath
  -> on failure: Blob delete(path)

GET /api/passages/{passageId}/file
  -> Clerk auth userId
  -> repository loads owned passage + filePath
  -> server reads private Blob
  -> stream response with safe headers
```

User deletion ordering:

1. Query all owned non-null `filePath` values.
2. Delete blobs; missing blobs count as success.
3. If cleanup fails, return webhook error for retry and keep DB profile.
4. Delete profile; FK cascades owned database records.

## File Inventory

| Action | File | Change | Test impact |
|---|---|---|---|
| Modify | `package.json`, `pnpm-lock.yaml` | Add `@vercel/blob` | Install/build |
| Create | `src/lib/storage/vercel-blob-storage.ts` | Private put/read/delete adapter | Storage unit tests |
| Delete later | `src/lib/storage/supabase-storage.ts` | Superseded adapter | Phase 7 |
| Modify | `src/features/upload/upload-workflow.ts` | Store path; preserve rollback cleanup | Service integration |
| Modify | `src/features/upload/content-analysis-service.ts` | Persist `filePath` | Service integration |
| Modify | `src/app/api/upload/route.ts` | Remove URL exposure from response | Route contract tests |
| Create | `src/app/api/passages/[passageId]/file/route.ts` | Authorized private file stream | Route integration |
| Modify | `src/lib/db/passage-queries.ts` | Owned file lookup/list-for-deletion APIs | Repository tests |
| Modify | `src/lib/auth/profile-sync.ts` | Blob cleanup before profile deletion | Webhook tests |
| Modify | upload/storage fixtures and docs | `fileUrl` to `filePath`/no public URL | Broad tests |

## Interface Checklist

- [ ] `uploadPrivateFile()` returns pathname/metadata, never a public URL.
- [ ] `deletePrivateFile()` treats not-found as idempotent success.
- [ ] `readPrivateFile()` is server-only and accepts stored pathname.
- [ ] Upload rollback knows whether a blob was committed.
- [ ] Authorized file route uses owned-passage repository.
- [ ] File response sets safe content type/disposition and no-store caching.
- [ ] User-delete cleanup handles zero, one, and many blobs.

## Implementation Steps

1. Add Vercel Blob dependency and server-only private storage adapter.
2. Use opaque/randomized path suffixes under a user/passage namespace.
3. Change upload workflow and persistence to `filePath`; preserve parse/analyze
   behavior and compensating deletion.
4. Remove private storage location from public upload response DTO.
5. Add owned-file repository lookup and authenticated file streaming route.
6. Integrate all-user-file cleanup into Clerk delete lifecycle before profile delete.
7. Add retry/error logging without tokens, URLs, or document content.
8. Replace upload/storage tests with Vercel Blob mocks and ownership cases.

## Test Scenario Matrix

| Priority | Scenario | Expected |
|---|---|---|
| Critical | User A requests User B file | Not found/denied; no Blob read |
| Critical | Analyze/persist fails after upload | Blob deleted exactly/idempotently |
| Critical | Clerk delete with Blob failure | Profile retained; webhook retryable |
| Critical | Successful Clerk delete | Blobs deleted, profile cascaded |
| High | Upload success | DB stores path; response exposes no provider URL |
| High | Missing blob during cleanup | Treated as successful cleanup |
| High | Authorized file request | Private content streamed with safe headers |
| Medium | Unsupported/oversized file | Rejected before Blob upload |

## Dependency Map

- Requires Phase 2 `filePath` schema.
- Requires Phase 4 owned-passage repository boundary.
- Completes Phase 3 user-deletion lifecycle.
- Phase 7 deletes Supabase storage dependency after this is active.

## Success Criteria

- [ ] All uploads use private Vercel Blob.
- [ ] No API/UI receives a private Blob URL or token.
- [ ] Authorized file route denies cross-user access.
- [ ] Upload rollback and account deletion clean blobs reliably.
- [ ] Passage persistence uses `filePath` only.
- [ ] Storage tests cover failure/retry/idempotency paths.

## Risk Assessment

- Risk: DB row and Blob write cannot be one transaction.
  Mitigation: explicit compensating deletion and retry-safe operations.
- Risk: account deletion leaves orphan blobs.
  Mitigation: blob-first deletion and webhook retry on failure.
- Risk: route streams untrusted content inline.
  Mitigation: safe content type, attachment disposition where appropriate, no-store.

## Security Considerations

- `BLOB_READ_WRITE_TOKEN` is server-only.
- Never redirect clients to provider private URLs.
- Verify ownership before any Blob read/delete initiated by an app request.
- Avoid user-controlled raw pathnames; construct paths from sanitized components.
