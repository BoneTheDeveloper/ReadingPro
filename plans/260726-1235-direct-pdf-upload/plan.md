# Direct-to-Blob PDF uploads + delete `infrastructure/storage/`

## Status

- **Phase:** planned (not yet executed)
- **Branch:** `preview`
- **Owner:** TBD
- **Date:** 2026-07-26
- **Issue / ticket:** none
- **Depends on:** `BLOB_READ_WRITE_TOKEN` (already present in `.env.example`)
- **Blocks:** none
- **Canonical plan file:** `~/.claude/plans/snuggly-crunching-kettle.md` (this file mirrors it in full)

## Acceptance criteria

- PDF uploads of up to 10 MB complete browser → Vercel Blob directly; no `Buffer.from(await file.arrayBuffer())` anywhere in `src/features/upload/server/actions/`.
- `src/infrastructure/storage/` directory deleted; no remaining imports of it under `src/`.
- `Passage.filePath` ownership check in `src/app/api/storage/source/route.ts` is byte-identical.
- `pnpm typecheck && pnpm lint && pnpm knip` all green.
- Clean PDF upload (≤10 MB) creates a `Passage` row and renders in the study workspace.
- TXT and YouTube upload flows are unchanged.
- `UploadJob` schema is unchanged (no Prisma migration).

## Locked decisions

- `MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024` preserved.
- `UploadStatus` stays 4-valued (`PENDING | PROCESSING | DONE | FAILED`). No 5th "ready" status. Intermediate readiness is implied by the existence of a `FileUploadIntent` row scoped to `(userId, pathname)`.
- `crypto.randomUUID()` for `passageId` in the hook stays.
- Job-first: `UploadJob(PENDING)` row exists before any fallible I/O.
- `Passage.filePath` uniqueness and ownership check in `/api/storage/source` stay byte-identical.
- No new public env vars. `BLOB_READ_WRITE_TOKEN` (server-only) is sufficient.
- `getViewableUrl` co-located on `src/app/api/storage/source/route.ts`.
- `downloadFile` co-located with the Inngest worker.
- `src/infrastructure/storage/` deleted at the end.

## Architecture

```
Browser (useUploadSubmit.handleFileUpload)
   │
   │  1. Server Action: prepareUploadAction({passageId, title, startedAt, mimeType, size})
   ▼
Next.js Server Action → auth → UploadJob(PENDING) insert → returns { jobId, pathname, handleUploadUrl }
   │
   │  2. @vercel/blob/client upload(pathname, file, { handleUploadUrl, clientPayload: { jobId }, multipart: true, onUploadProgress })
   ▼
Vercel Blob (browser → *.blob.vercel-storage.com, serverless token-gated)
   ▲
   │
Next.js /api/upload POST → handleUpload({ onBeforeGenerateToken: insert FileUploadIntent, onUploadCompleted: no-op })
   │
   │  3. upload() resolves → Browser calls notifyUploadComplete({ jobId, pathname, title, passageId, startedAt })
   ▼
Next.js Server Action → auth → verify UploadJob + FileUploadIntent → inngest.send("upload/process")
   │
   ▼
Inngest processUploadJob → step("resolve-text"): downloadFile → validateFileContent (magic bytes) → parsePDF
                                  → step("analyze-content") → step("create-passage") → step("update-done")
```

Bytes cross the network once (browser → Vercel Blob). `validateFileContent` is the worker-trust boundary.

## Critical files

### New files

- `/home/luc/Project/english-reading-training-app/src/app/api/upload/route.ts`
- `/home/luc/Project/english-reading-training-app/src/features/upload/server/actions/prepare-upload.ts`
- `/home/luc/Project/english-reading-training-app/src/features/upload/server/actions/notify-upload-complete.ts`
- `/home/luc/Project/english-reading-training-app/src/features/upload/server/actions/abort-upload.ts`
- `/home/luc/Project/english-reading-training-app/src/features/upload/server/inngest/blob.ts`

### Edits

- `/home/luc/Project/english-reading-training-app/src/features/upload/hooks/use-upload-submit.ts`
- `/home/luc/Project/english-reading-training-app/src/features/upload/server/inngest/handle-upload-event.ts`
- `/home/luc/Project/english-reading-training-app/src/app/api/storage/source/route.ts`
- `/home/luc/Project/english-reading-training-app/src/features/passage-crud/server/actions/passage.ts`
- `/home/luc/Project/english-reading-training-app/src/features/upload/server/actions/upload.ts` (delete `uploadFileAction`)
- `/home/luc/Project/english-reading-training-app/next.config.ts`

### Deletions

- `/home/luc/Project/english-reading-training-app/src/infrastructure/storage/` (whole directory)

## Phases

### Phase 1 — Relocate `downloadFile`/`deleteFile` to the worker dir

1. Add `src/features/upload/server/inngest/blob.ts` with `downloadFile`/`deleteFile` (verbatim from current `blob-adapter.ts`).
2. Edit `src/features/upload/server/inngest/handle-upload-event.ts`:
   - Replace `import { downloadFile, deleteFile } from "@/infrastructure/storage/index"` with `import { downloadFile, deleteFile } from "./blob"`.
   - Add `import { validateFileContent } from "@/features/upload/lib/upload-validation"`.
   - In `step("resolve-text")` PDF branch, insert `validateFileContent(buffer, "application/pdf")` between `downloadFile` and `parsePDF`; throw on `!valid`.

Validation: `pnpm typecheck`. Worker still has the same `UploadJob`/`Passage` schema.

### Phase 2 — Add new server actions

3. Add `src/features/upload/server/actions/prepare-upload.ts` (`"use server"`). Zod-validated input. Auth. `UploadJob(PENDING, blobPath)` create. Returns `{ jobId, pathname, handleUploadUrl: "/api/upload" }`. **No buffers.**
4. Add `src/features/upload/server/actions/notify-upload-complete.ts` (`"use server"`). Auth. Verifies `UploadJob` (`userId`, `jobId`, `blobPath` matches, `status === "PENDING"` — idempotent). Verifies `FileUploadIntent` exists and is not expired. Sends `inngest.send(createUploadProcessEvent(...))`.
5. Add `src/features/upload/server/actions/abort-upload.ts` (`"use server"`). Marks `UploadJob.FAILED` with `error: "Upload aborted"`. Used by the hook if direct upload throws.

### Phase 3 — Add the `/api/upload` route

6. Add `src/app/api/upload/route.ts`. `POST` wrapped in `withAuth(handler)` from `src/lib/auth/with-auth.ts`. Uses `handleUpload` from `@vercel/blob`. `onBeforeGenerateToken` validates pathname shape, MIME, size, looks up `UploadJob`, upserts `FileUploadIntent` keyed by `pathname` with `expiresAt = now + 1h`. Returns `{ allowedContentTypes: ["application/pdf"], maximumSizeInBytes: MAX_FILE_SIZE_BYTES, tokenPayload: JSON.stringify({ jobId }) }`. `onUploadCompleted` is a no-op.

Validation: `pnpm typecheck`. Route compiles and is wired before the client switches.

### Phase 4 — Co-locate `getViewableUrl` on the source route

7. Edit `src/app/api/storage/source/route.ts`:
   - Add `export function getViewableUrl(pathname: string): string` returning `/api/storage/source?pathname=${encodeURIComponent(pathname)}`.
   - Replace the `downloadFile` import (line 15) with a local `downloadFile` using `@vercel/blob` `get` directly (private access).
8. Edit `src/features/passage-crud/server/actions/passage.ts` line 7: rewrite import to `import { getViewableUrl } from "@/app/api/storage/source/route"`.

Validation: `pnpm typecheck`. `getPassageSourceUrlAction` still returns the same URL.

### Phase 5 — Switch the client hook to direct uploads

9. Edit `src/features/upload/hooks/use-upload-submit.ts` `handleFileUpload` (lines 86–122) to:
   1. `crypto.randomUUID()` for `passageId`, `Date.now()` for `startedAt`, `title = file.name.replace(/\.(txt|pdf)$/, "")`.
   2. `await prepareUploadAction(...)` → `onUploadStart`.
   3. `try { upload(pathname, file, { access: "private", handleUploadUrl, clientPayload: JSON.stringify({ jobId }), multipart: true, onUploadProgress }) } catch (err) { await abortUploadAction({ jobId }).catch(() => {}); throw err }`.
   4. `await notifyUploadComplete({ jobId, pathname, title, passageId, startedAt })`.
   5. `await pollJobStatus(jobId)` unchanged.

Public API of `useUploadSubmit` (return value, `onUploadStart`/`onComplete`/`onError`) is unchanged. `passageId` UUIDs at lines 90, 128, 160 (text + YouTube) remain untouched.

### Phase 6 — Delete `uploadFileAction` and the storage adapter

10. Edit `src/features/upload/server/actions/upload.ts`: delete `uploadFileAction` (lines 60–150) and the now-unused imports of `validateFile`, `validateFileContent`, `uploadFile`, `Buffer`. Keep `uploadTextAction`, `uploadYouTubeAction`, `getUploadStatus`, `newJobId`, `sourceTypeFromExtension`, and the two zod schemas.
11. Verify `git grep -nE "infrastructure/storage" src/` returns empty.
12. Delete `src/infrastructure/storage/blob-adapter.ts`, `src/infrastructure/storage/index.ts`, and the now-empty `src/infrastructure/storage/` directory.

### Phase 7 — CSP and dead-code cleanup

13. Edit `next.config.ts`:
    - Add `https://*.blob.vercel-storage.com` to `connect-src` (lines 23–31).
    - Drop `serverActions.bodySizeLimit: "10mb"` from `experimental.serverActions` (lines 65–71). Files no longer touch a Server Action.
    - Keep `serverExternalPackages: ["pino", "pino-pretty", "pdf-parse"]` (worker still needs `pdf-parse`).

### Phase 8 — Verification

```sh
git grep -nE "infrastructure/storage" src/                # expect: empty
git grep -nE "arrayBuffer.*file|file.*arrayBuffer" src/features/upload/server/actions/  # expect: empty
git grep -nE "\buploadFile\b" src/                          # expect: empty
pnpm typecheck
pnpm lint
pnpm knip
pnpm build
```

Manual smoke test (runs against dev + Inngest dev server):

1. `pnpm dev:inngest` and `pnpm dev` in two terminals.
2. Log in, open the upload modal, upload a ≤10 MB PDF.
3. Browser devtools → Network panel → filter `blob-storage.com`. Expect: POST `/api/upload` (`type=upload`) → 200; several PATCHes to `https://<storeId>.blob.vercel-storage.com/...` from the browser; POST `/api/upload` (`type=upload-completed`) → 200; Server Action `notifyUploadComplete` → `{success:true}`; Inngest shows `process-upload-job` running `step("resolve-text")` calling `downloadFile → validateFileContent → parsePDF`; UI shows PENDING → PROCESSING → DONE; passage appears.
4. Vercel Blob dashboard: confirm `uploads/<userId>/<passageId>.pdf` exists.
5. Open the passage viewer. `getPassageSourceUrlAction` returns the URL; `<iframe>` loads the content.
6. `GET /api/storage/source?pathname=uploads/<userId>/<passageId>.pdf` with no cookie → 401; wrong cookie → 404/403.
7. TXT upload — no `*.blob-storage.com` traffic.
8. YouTube upload — unchanged.
9. Trigger a >10MB PDF (devtools override) → client shallow check rejects before any fetch.
10. Rename a non-PDF file as `.pdf` → worker's `validateFileContent` fails → job ends `FAILED` → `cleanupOnFailure` deletes the blob.
11. `rg "buffer.*put|put.*Buffer" src/` returns empty.

## Risks

| Risk | Mitigation |
|---|---|
| Direct upload succeeds, `notifyUploadComplete` fails | `notifyUploadComplete` is idempotent (`if (status !== "PENDING") return success`). Sweep cron (out-of-scope) marks `PENDING` &gt; 30 min as `FAILED`. |
| User refreshes during upload | `FileUploadIntent.expiresAt = now + 1h`. Stale-row cron (out-of-scope) deletes expired intents. |
| Two concurrent uploads, same pathname | `FileUploadIntent.pathname @unique` upsert + `UploadJob.id` unique. Last write wins; loser triggers `create-passage` PK collision → handled. |
| Retries of `handleUpload` for same `clientPayload` | `FileUploadIntent` upsert by `pathname` + 1h TTL → idempotent. |
| Non-PDF bytes uploaded via extension spoof | `handleUpload` rejects non-PDF MIME + worker `validateFileContent` rejects non-magic bytes + `parsePDF` throws. |
| CSP mismatch on first deploy | Add wildcard, redeploy, verify Network panel shows 200s on blob domain. |
| zod parse failure in `notifyUploadComplete` | Throws → `useUploadSubmit` catch → Sentry + `onError` → modal shows message. |
| Race between upload completing and worker reading | Vercel Blob uploads are strongly consistent once `upload()` resolves. |

## Out-of-scope follow-ups

- Stale `FileUploadIntent` sweep cron (already-planned `CRON_SECRET` env var in `.env.example`).
- `notifyUploadComplete` client-side retry.
- Sentry instrumentation around `prepareUploadAction`, `/api/upload`, `notifyUploadComplete`.
- `UploadJob` schema widening to include `title`/`passageId`/`startedAt` (avoids re-passing them through `notifyUploadComplete`).

## Reference

- Canonical plan file: `~/.claude/plans/snuggly-crunching-kettle.md`
- Vercel Blob client-upload docs: `https://vercel.com/docs/storage/vercel-blob/client-upload`
- Better Auth helper: `src/lib/auth/with-auth.ts` (used in the new `/api/upload` route)
