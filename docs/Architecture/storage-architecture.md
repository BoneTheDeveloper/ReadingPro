# Storage Architecture

## Storage Adapter

`src/lib/storage/blob-storage.ts` exposes one storage API:

- `uploadFile(filename, buffer, contentType)`
- `deleteFile(pathname)`
- `getSignedUrl(pathname)`
- `readFileBuffer(pathname)` for local development reads

## Environments

| Environment | Backend |
|-------------|---------|
| Local development | `.local-blob-storage/` filesystem directory |
| Vercel preview | Private Vercel Blob store/token |
| Vercel production | Separate private Vercel Blob store/token |

## Path Contract

`Passage.filePath` stores the storage pathname, not a provider-specific public URL. This keeps persisted records portable across local, preview, and production storage adapters.

## Local Private File Access

`GET /api/local-blob/[pathname]` serves local files only when `NODE_ENV === "development"`. It returns `404` outside development.

## Production Access

Preview and production uploads use Vercel Blob with `access: "private"` and `addRandomSuffix: false`. Any future download endpoint must authenticate and verify ownership before exposing a signed URL.
