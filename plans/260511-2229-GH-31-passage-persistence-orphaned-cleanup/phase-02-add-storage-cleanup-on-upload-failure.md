---
phase: 2
title: "Add storage cleanup on upload failure"
status: pending
priority: P2
effort: "30m"
dependencies: []
---

# Phase 2: Add storage cleanup on upload failure

## Overview

In `upload/route.ts`, the file is uploaded to Supabase Storage before text extraction and validation. If validation fails (e.g., word count < 50), the file stays orphaned in storage. `deleteFile()` exists in `supabase-storage.ts` but is never called from error paths.

## Requirements

- Functional: Clean up stored file whenever the upload flow fails after storage succeeds
- Non-functional: Best-effort cleanup (log warning if delete fails, don't throw)

## Architecture

```
upload/route.ts POST handler:
  1. Validate file metadata → fail early (no storage cleanup needed)
  2. Upload to storage → storageResult (now we have a file to clean up)
  3. Extract text / validate word count → FAIL → deleteFile(filename) → return error
  4. Call analyzeContentAction → FAIL → deleteFile(filename) → return error
  5. Success → return response (no cleanup)
```

## Related Code Files

- Modify: `src/app/api/upload/route.ts`

## Implementation Steps

1. Import `deleteFile` from `@/lib/storage/supabase-storage`
2. After the storage upload succeeds (line ~56), wrap remaining steps so that on any validation/analysis failure, `deleteFile(filename)` is called before returning the error response
3. Add a helper or inline try/catch around the cleanup call — log warning if delete fails but still return the original error to the client

Specific error paths to add cleanup:
- Word count too low (line ~78): `deleteFile(filename)` before 400 response
- `analyzeContentAction` returns error (line ~92): `deleteFile(filename)` before 400 response
- Catch block (line ~98): `deleteFile(filename)` if `storageResult` exists, before 500 response

## Success Criteria

- [ ] Upload a file with <50 words → file does NOT remain in Supabase Storage
- [ ] Upload a valid file → file remains in storage (not deleted)
- [ ] Storage delete failure doesn't crash the upload route (graceful)

## Risk Assessment

- **Risk:** Race condition if user uploads same filename twice rapidly. **Mitigation:** Low probability; filenames include timestamp. Accept for now.
