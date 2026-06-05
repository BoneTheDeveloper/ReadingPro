---
phase: 5
title: "Private Vercel Blob Storage"
status: pending
priority: P1
effort: "10h"
dependencies: [4]
---

# Phase 5: Private Vercel Blob Storage

## Overview

Replace Supabase Storage with private Vercel Blob while preserving the current
10 MB upload contract. Because Vercel Functions accept only 4.5 MB request
bodies, files upload directly from the browser using a short-lived,
server-authorized client token. A durable upload intent, server finalization,
and bounded cleanup prevent unauthorized or orphaned blobs.

## Context Links

- [Plan](./plan.md)
- [Current storage adapter](../../../src/lib/storage/supabase-storage.ts)
- [Upload workflow](../../../src/features/upload/upload-workflow.ts)
- [Upload route](../../../src/app/api/upload/route.ts)
- [Vercel Blob private storage](https://vercel.com/docs/vercel-blob/private-storage)
- [Vercel Blob client uploads](https://vercel.com/docs/vercel-blob/client-upload)
- [Vercel Function payload limit](https://vercel.com/docs/functions/limitations)
- [Vercel Blob SDK](https://vercel.com/docs/storage/vercel-blob/using-blob-sdk)

## Requirements

- Functional:
  - Authenticated browser uploads validated PDF/text files directly to private Blob.
  - Server issues short-lived, user/path/content-type/size-scoped upload tokens.
  - Durable `FileUploadIntent` exists before a token is issued.
  - Server finalization validates intent ownership and actual Blob metadata/content.
  - `Passage.filePath` stores pathname; no public/private provider URL is stored.
  - Final application upload DTO does not expose a Blob URL or token.
  - Authorized file route verifies Clerk user and passage ownership before streaming.
  - Failed/abandoned upload, passage deletion, and Clerk user deletion clean blobs.
- Non-functional:
  - Storage adapter remains provider-contained and server-only.
  - Client never receives `BLOB_READ_WRITE_TOKEN`; a private Blob URL alone grants no access.
  - Finalization and cleanup are retryable/idempotent.
  - Cleanup work is bounded per request/run.
  - Existing validation, parsing, and upload limits remain.

## Architecture

```text
POST /api/upload/intents
  -> Clerk auth userId
  -> validate filename/type/declared size
  -> create expiring FileUploadIntent + server-generated pathname

Browser -> @vercel/blob/client upload(pathname, file)
  -> POST /api/upload/blob token exchange
  -> re-auth + load owned unexpired intent
  -> return short-lived token: exact path, txt/pdf, max 10 MB
  -> browser uploads directly to private Blob

POST /api/upload/finalize
  -> Clerk auth + owned intent/path
  -> private Blob get/head; verify <=10 MB, media type, extension/magic bytes
  -> parse/analyze
  -> transaction: create Passage(filePath) + questions; delete intent
  -> retry: return existing owned Passage by unique filePath
  -> failure: delete Blob; retain intent only when cleanup must retry

GET /api/passages/{passageId}/file
  -> Clerk auth + owned passage/filePath
  -> private Blob get(pathname, access=private)
  -> stream with safe headers and no-store
```

User deletion ordering:

1. Query a bounded page of owned non-null `Passage.filePath` plus pending upload intents.
2. Delete blobs; missing blobs count as success.
3. Null each successfully deleted passage path and delete each cleaned intent.
4. Retry webhook until no owned blob references/intents remain.
5. Delete profile; FK cascades owned database records.

Passage deletion follows the same blob-first rule, then sets `deletedAt` and
clears `filePath` transactionally. Expired-intent cleanup uses the DB as source
of truth; it does not list or guess Blob prefixes.

## File Inventory

| Action | File | Change | Test impact |
|---|---|---|---|
| Modify | `package.json`, `pnpm-lock.yaml` | Add `@vercel/blob` | Install/build |
| Create | `src/lib/storage/vercel-blob-storage.ts` | Private get/head/delete adapter and error mapping | Storage unit tests |
| Create | `src/lib/db/file-upload-intent-repository.ts` | Owned intent lifecycle/expiry queries | Repository tests |
| Delete later | `src/lib/storage/supabase-storage.ts` | Superseded adapter | Phase 7 |
| Modify | `src/features/upload/upload-workflow.ts` | Intent finalization, idempotency, rollback cleanup | Service integration |
| Modify | `src/features/upload/content-analysis-service.ts` | Transactional `filePath` persistence/finalization | Service integration |
| Replace | `src/app/api/upload/route.ts` | Remove multipart-through-function upload path | Route contract tests |
| Create | `src/app/api/upload/intents/route.ts` | Create owned expiring upload intent | Route integration |
| Create | `src/app/api/upload/blob/route.ts` | Authenticated Blob client-token exchange/callback | Route integration |
| Create | `src/app/api/upload/finalize/route.ts` | Authenticated server finalization | Route integration |
| Create | `src/app/api/passages/[passageId]/file/route.ts` | Authorized private file stream | Route integration |
| Create | `src/app/api/internal/cleanup-expired-uploads/route.ts` | Bounded `CRON_SECRET`-protected orphan cleanup | Route/service tests |
| Modify | `src/lib/db/passage-queries.ts` | Owned file lookup, finalization retry, bounded cleanup APIs | Repository tests |
| Modify | `src/lib/auth/profile-sync.ts` | Bounded Blob cleanup before profile deletion | Webhook tests |
| Modify | `src/features/study/actions/study-delete-passage-action.ts` | Blob-first passage deletion | Action tests |
| Modify | upload UI/client, storage fixtures, and docs | Direct client upload + finalization; `fileUrl` to `filePath` | Broad tests |

## Interface Checklist

- [ ] Upload-intent creation returns only owned intent ID/pathname and expiry.
- [ ] Blob token exchange re-authenticates and validates exact owned intent/path.
- [ ] Vercel `onUploadCompleted` callback is SDK-verified, idempotent, and does
  not perform long-running analysis/finalization.
- [ ] Token limits content types, maximum 10 MB size, expiry, and overwrite behavior.
- [ ] Browser never receives the store read-write token.
- [ ] Finalizer validates actual Blob size/type/content and uses unique `filePath`.
- [ ] `deletePrivateFile()` treats not-found as idempotent success.
- [ ] `readPrivateFile()` is server-only and accepts stored pathname.
- [ ] Upload finalization retry returns existing owned passage without duplicate analysis/persistence.
- [ ] Upload rollback knows whether Blob and DB commits occurred.
- [ ] Authorized file route uses owned-passage repository.
- [ ] File response sets safe content type/disposition and no-store caching.
- [ ] Passage/user/expired-intent cleanup handles zero, one, many, partial failure, and retry.

## Implementation Steps

1. Add Vercel Blob dependency and server-only private get/head/delete adapter.
2. Create server-generated upload intents and pathnames under
   `users/{userId}/uploads/{intentId}/{sanitizedName}`.
3. Replace multipart-through-function upload with `@vercel/blob/client` token
   exchange. Enforce exact intent path, short expiry, txt/pdf types, 10 MB max,
   and no overwrite. Keep the SDK-verified completion callback short and
   idempotent; browser-authenticated finalization owns analysis/persistence.
4. Implement authenticated finalization: load intent, get private Blob, inspect
   actual size/type/magic bytes, parse/analyze, persist unique `filePath`, and
   delete intent in the final DB transaction.
5. Make finalization retry-safe by returning the actor-owned passage already
   stored for the unique path.
6. Remove Blob location from the final application upload DTO.
7. Add owned-file repository lookup and authenticated private streaming route.
8. Add blob-first passage deletion and bounded user-deletion cleanup that
   clears successful DB references before retry.
9. Add bounded expired-intent cleanup route; Phase 6 schedules it.
10. Add privacy-safe retry/error logging and focused storage/ownership tests.

## Test Scenario Matrix

| Priority | Scenario | Expected |
|---|---|---|
| Critical | User A requests User B file | Not found/denied; no Blob read |
| Critical | 10 MB browser upload | Bypasses Function body limit; token enforces max |
| Critical | Forged intent/path/token request | Rejected before client token issuance |
| Critical | Forged Blob completion callback | Rejected by SDK verification; no workflow calls |
| Critical | Spoofed MIME or oversized Blob | Finalization rejects and cleans Blob |
| Critical | Analyze/persist fails after direct upload | Blob deleted exactly/idempotently |
| Critical | Finalization replay | Existing owned passage returned; no duplicate |
| Critical | Clerk delete with partial Blob failure | Successful paths cleared; profile retained; webhook retryable |
| Critical | Successful Clerk delete | Blobs deleted, profile cascaded |
| Critical | Abandoned upload expires | Cron cleanup removes Blob/intent idempotently |
| High | Upload success | DB stores path; final app response exposes no provider URL |
| High | Missing blob during cleanup | Treated as successful cleanup |
| High | Authorized file request | Private content streamed with safe headers |
| High | Passage delete with file | Blob deleted before soft delete/path clear |

## Dependency Map

- Requires Phase 2 `filePath` schema.
- Requires Phase 2 `FileUploadIntent` schema.
- Requires Phase 4 owned-passage repository boundary.
- Completes Phase 3 user-deletion lifecycle.
- Phase 7 deletes Supabase storage dependency after this is active.

## Success Criteria

- [ ] 10 MB uploads use authenticated direct client upload to private Vercel Blob.
- [ ] No browser receives `BLOB_READ_WRITE_TOKEN`; final app DTO exposes no Blob URL.
- [ ] Upload intent/finalization is ownership-checked, content-validated, and idempotent.
- [ ] Authorized file route denies cross-user access.
- [ ] Upload rollback, abandoned intents, passage deletion, and account deletion clean blobs reliably.
- [ ] Passage persistence uses `filePath` only.
- [ ] Storage tests cover failure/retry/idempotency paths.

## Risk Assessment

- Risk: client upload token is used to create unauthorized/oversized content.
  Mitigation: owned intent, exact pathname, short expiry, token limits, and
  server finalization validation.
- Risk: DB row and Blob write cannot be one transaction.
  Mitigation: durable intent, unique final path, explicit compensating deletion,
  retry-safe finalization, and expired-intent cleanup.
- Risk: account/passage deletion leaves orphan blobs.
  Mitigation: blob-first bounded deletion, clear successful references, retry.
- Risk: route streams untrusted content inline.
  Mitigation: safe content type, attachment disposition where appropriate, no-store.

## Security Considerations

- `BLOB_READ_WRITE_TOKEN` is server-only.
- A private Blob URL/pathname is not authorization; never expose the read-write token.
- The public Blob completion callback trusts only the SDK-verified callback
  envelope/token payload and never trusts client identity fields.
- Verify ownership before any Blob read/delete initiated by an app request.
- Never trust client-declared file type/size; verify Blob metadata/content at finalization.
- Avoid user-controlled raw pathnames; issue and verify server-generated intent paths.
