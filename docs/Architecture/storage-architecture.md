# Storage Architecture

## Storage Adapter

`src/server/storage/blob-storage.ts` exposes one storage API:

- `uploadFile(filename, buffer, contentType)`
- `deleteFile(pathname)`
- `getSignedUrl(pathname)`
- `readFileBuffer(pathname)` for local development reads

## Environments

| Environment | Backend |
|-------------|---------|
| Local development | `.local-blob-storage/` filesystem directory |
| Vercel preview | Private Vercel Blob store/token |

## Path Contract

`Passage.filePath` stores the storage pathname, not a provider-specific public URL. This keeps persisted records portable across local and preview storage adapters.

## Local Private File Access

`GET /api/local-blob/[pathname]` serves local files only when `NODE_ENV === "development"`. It returns `404` outside development.
