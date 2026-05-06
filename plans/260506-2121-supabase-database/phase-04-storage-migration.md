---
title: "Phase 04: Storage Migration to Supabase Storage"
description: "Replace local file system uploads with Supabase Storage bucket for PDF/text file persistence"
status: pending
priority: P2
effort: 3h
branch: feature/supabase-database
---

## Context Links

- `src/app/api/upload/route.ts` — current file upload using `fs/promises` to `uploads/content/`
- `src/app/actions/study-upload-action.ts` — server action for text upload (no file storage)
- `src/lib/validation/upload.ts` — file validation (size, type)
- `package.json` — current deps (no Supabase client yet)
- Phase 01 — Supabase project setup (credentials, `@supabase/supabase-js`)

## Overview

Replace local file system writes (`fs.writeFile` to `uploads/content/`) with Supabase Storage uploads. Create a storage utility module. Update the upload API route to use Supabase Storage. Keep local uploads as fallback for dev/offline.

## Key Insights

### Current Upload Flow

```
POST /api/upload
  → validateFile(file)           // size, type check
  → ensureUploadDir()            // mkdir uploads/content/
  → writeFile(filepath, buffer)  // write to disk
  → parse PDF or read text
  → analyzeContentAction(formData)
  → return { filename, passageId, ... }
```

Key observations:
- `filename` is generated as `${timestamp}-${safeName}` and stored in response but NOT in the database
- `Passage.fileUrl` field exists in schema but is never populated in current upload flow
- `study-upload-action.ts` handles text-only uploads (no file storage)
- The `analyzeContentAction` call in upload route processes the extracted text — file storage is separate from content analysis

### What Changes

- File bytes go to Supabase Storage bucket instead of local disk
- `Passage.fileUrl` gets populated with the Supabase Storage public URL
- File retrieval for future reference uses the Storage URL
- PDF parsing still happens in-memory before upload (buffer already available)

### Storage Bucket Design

- **Bucket name:** `content-uploads`
- **Access:** Private by default, signed URLs for access (or public if files have no PII)
- **File naming:** Keep `${timestamp}-${safeName}` pattern for uniqueness
- **Folder structure:** Flat or `{userId}/` prefix once auth ships

### Files Affected

Only `src/app/api/upload/route.ts` uses `fs/promises` for file writing. `study-upload-action.ts` handles text input only — no changes needed.

## Requirements

### Functional
- Files uploaded to Supabase Storage bucket `content-uploads`
- `Passage.fileUrl` populated with storage URL after upload
- PDF parsing works identically (in-memory buffer, no change)
- File validation unchanged (size, type checks)

### Non-Functional
- Upload latency acceptable (< 2s for 10MB file)
- Storage utility reusable across the app
- Local dev works with Supabase Storage (uses project credentials)
- No `fs/promises` usage for file storage after migration

## Related Code Files

| File | Action |
|------|--------|
| `src/lib/storage/supabase-storage.ts` | Create — Storage utility module |
| `src/app/api/upload/route.ts` | Modify — replace `writeFile` with Storage upload |
| `src/lib/validation/upload.ts` | No change — validation stays the same |
| `src/app/actions/study-upload-action.ts` | No change — text-only, no file storage |

## Implementation Steps

1. **Create Supabase Storage bucket**
   Via Supabase Dashboard > Storage or SQL:
   ```sql
   INSERT INTO storage.buckets (id, name, public)
   VALUES ('content-uploads', 'content-uploads', false);
   ```
   Or via Dashboard: Storage > New bucket > Name: `content-uploads`, Private.

2. **Create storage access policies for the bucket**
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Users can upload content" ON storage.objects
     FOR INSERT WITH CHECK (bucket_id = 'content-uploads');

   -- Allow users to read their own uploads
   CREATE POLICY "Users can read own uploads" ON storage.objects
     FOR SELECT USING (bucket_id = 'content-uploads');

   -- Allow users to delete their own uploads
   CREATE POLICY "Users can delete own uploads" ON storage.objects
     FOR DELETE USING (bucket_id = 'content-uploads');
   ```

3. **Create `src/lib/storage/supabase-storage.ts`**
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   import { createModuleLogger } from '@/lib/core/logger';

   const log = createModuleLogger('storage:supabase');

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for server-side uploads
   );

   const BUCKET_NAME = 'content-uploads';

   export async function uploadFile(
     filename: string,
     buffer: Buffer,
     contentType: string
   ): Promise<{ url: string; path: string } | null> {
     const { data, error } = await supabase.storage
       .from(BUCKET_NAME)
       .upload(filename, buffer, {
         contentType,
         upsert: false,
       });

     if (error) {
       log.error({ err: error, filename }, 'Storage upload failed');
       return null;
     }

     const { data: urlData } = supabase.storage
       .from(BUCKET_NAME)
       .getPublicUrl(data.path);

     return {
       url: urlData.publicUrl,
       path: data.path,
     };
   }

   export async function getFileUrl(path: string): Promise<string | null> {
     // For private buckets, use signed URL:
     const { data, error } = await supabase.storage
       .from(BUCKET_NAME)
       .createSignedUrl(path, 3600); // 1 hour expiry

     if (error) {
       log.error({ err: error, path }, 'Signed URL generation failed');
       return null;
     }

     return data.signedUrl;
   }

   export async function deleteFile(path: string): Promise<boolean> {
     const { error } = await supabase.storage
       .from(BUCKET_NAME)
       .remove([path]);

     if (error) {
       log.error({ err: error, path }, 'Storage delete failed');
       return false;
     }

     return true;
   }
   ```

4. **Update `src/app/api/upload/route.ts`**
   Replace `fs/promises` file writing with Supabase Storage upload:

   ```typescript
   // REMOVE these imports:
   // import { writeFile, mkdir } from 'fs/promises';
   // import { existsSync } from 'fs';
   // import path from 'path';

   // ADD this import:
   import { uploadFile } from '@/lib/storage/supabase-storage';

   // REPLACE ensureUploadDir + writeFile block:
   // Before:
   //   await ensureUploadDir();
   //   const filepath = path.join(UPLOAD_DIR, filename);
   //   await writeFile(filepath, buffer);

   // After:
   const storageResult = await uploadFile(filename, buffer, file.type);
   if (!storageResult) {
     return NextResponse.json(
       { error: 'Failed to store file' },
       { status: 500 }
     );
   }

   // Store the fileUrl in passage creation (if analyzeContentAction supports it)
   // Note: fileUrl needs to be passed through to passage creation
   ```

5. **Update `analyzeContentAction` to accept and store `fileUrl`**
   Check `src/app/actions/analyze.ts` (or `study-upload-action.ts` for text flow) to pass `fileUrl` through to `createPassage` call:
   - Add `fileUrl` parameter to the action's FormData or arguments
   - Pass it to `db.passage.create({ data: { ..., fileUrl } })`

6. **Update response to include storage URL**
   The response currently returns `filename`. Update to return `fileUrl` from storage:
   ```typescript
   return NextResponse.json({
     success: true,
     data: {
       filename,
       fileUrl: storageResult.url,
       passageId: result.passageId,
       originalLevel: result.originalLevel,
       simplifiedLevel: result.simplifiedLevel,
       questionCount: result.questionCount,
     },
   });
   ```

7. **Remove local upload directory references**
   - Remove `UPLOAD_DIR` constant
   - Remove `ensureUploadDir` function
   - Remove `fs/promises` and `path` imports
   - Keep `uploads/` directory creation out of `.gitignore` (or remove if empty)

## Todo List

- [ ] Create `content-uploads` bucket in Supabase Storage
- [ ] Set bucket access policies
- [ ] Create `src/lib/storage/supabase-storage.ts` utility module
- [ ] Update `src/app/api/upload/route.ts` to use Storage
- [ ] Update passage creation to store `fileUrl`
- [ ] Remove `fs/promises` and local file writing code
- [ ] Test PDF upload end-to-end
- [ ] Test text file upload end-to-end
- [ ] Verify file retrieval via signed URL works

## Success Criteria

- [ ] Uploaded files appear in Supabase Storage > `content-uploads` bucket
- [ ] `Passage.fileUrl` populated with storage URL in database
- [ ] No files written to local `uploads/content/` directory
- [ ] PDF parsing still works (in-memory, unchanged)
- [ ] File download/retrieval works via signed URL
- [ ] No `fs/promises` imports for file storage in upload route
- [ ] Upload API response includes `fileUrl`

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Storage upload fails silently | Low | High | Check return value, return 500 on failure |
| Large file timeout (10MB) | Low | Medium | Supabase Storage handles up to 50MB; 10MB is well within limits |
| Signed URL expiry too short | Low | Low | 1-hour default is sufficient for immediate access |
| Service role key used in client | Low | Critical | Storage utility is server-only; never import in client components |
| Bucket doesn't exist at deploy time | Medium | Medium | Create bucket as part of Supabase migration (step 1) |
| `fileUrl` not passed through analyze pipeline | Medium | Medium | Trace the full flow from upload route -> analyze action -> createPassage |

## Security Considerations

- **Bucket is private** — no public read access. Signed URLs required for file access.
- **Service role key** used for server-side uploads only. Never exposed to client.
- **File validation** unchanged — `validateFile()` still checks size (10MB) and type (txt/pdf) before upload.
- **File naming** — timestamp + sanitized filename prevents path traversal.
- **Storage policies** — once auth ships, scope to `{userId}/` prefix for user isolation.

## Rollback Plan

1. Revert `src/app/api/upload/route.ts` to use `fs/promises`
2. Delete `src/lib/storage/supabase-storage.ts`
3. Files in Supabase Storage bucket remain (no data loss)
4. Re-add `UPLOAD_DIR` constant and `ensureUploadDir` function

## Next Steps

- Phase 05 (Connection Config) can proceed in parallel
- Phase 06 (Testing) validates upload flow end-to-end
