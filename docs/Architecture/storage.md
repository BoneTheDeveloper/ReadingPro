# Storage Architecture

## Storage Adapter

`src/infrastructure/storage.ts` exposes one unified storage API:

- `uploadFile(filename, buffer, contentType)` — Upload file, returns `{ url, pathname }`
- `deleteFile(pathname)` — Delete file by pathname
- `getViewableUrl(pathname)` — Get inline viewable URL (for PDFs, images)
- `getDownloadUrl(pathname)` — Get download URL
- `downloadFile(pathname)` — Download file as Buffer (for processing)

## Environment

All environments use **Vercel Blob** (private):

| Environment | Backend |
|-------------|---------|
| Development | Vercel Blob |
| Production | Vercel Blob |

**Setup:**
```bash
vercel env pull .env.local
```

## Path Contract

`Passage.filePath` stores the storage pathname (e.g., `uploads/userId/passageId.pdf`), not the full URL.
