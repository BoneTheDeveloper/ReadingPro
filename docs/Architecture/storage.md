# Storage Architecture

## Storage Adapter (Hybrid)

`src/infrastructure/storage.ts` exposes one unified storage API with adapter pattern:

- `uploadFile(filename, buffer, contentType)` — Upload file, returns `{ url, pathname }`
- `deleteFile(pathname)` — Delete file by pathname
- `getViewableUrl(pathname)` — Get inline viewable URL (for PDFs, images)
- `getDownloadUrl(pathname)` — Get download URL
- `downloadFile(pathname)` — Download file as Buffer (for processing)

### Adapter Pattern

```
src/infrastructure/storage.ts
├── storage/
│   ├── blob-adapter.ts    # Vercel Blob (production)
│   └── local-adapter.ts  # Local filesystem (development)
└── storage.ts            # Routes based on STORAGE_PROVIDER env
```

## Environment Configuration

| Environment | Provider | Adapter | Config |
|-------------|----------|---------|--------|
| Development | `STORAGE_PROVIDER=local` | Local filesystem (`tmp/uploads/`) | Fast, offline |
| Production | `STORAGE_PROVIDER=blob` (default) | Vercel Blob | Scalable cloud |

### Setup

**Development (.env.local):**
```bash
STORAGE_PROVIDER=local
```

**Production (Vercel):**
```bash
# No STORAGE_PROVIDER needed - defaults to Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

### Local Storage API

When `STORAGE_PROVIDER=local`, files are served via:
```
GET /api/storage/uploads/userId/file.pdf
```

## Path Contract

`Passage.filePath` stores the storage pathname (e.g., `uploads/userId/passageId.pdf`), not the full URL.

The unified API handles URL generation internally:
- **Local**: Returns `/api/storage/{pathname}`
- **Blob**: Returns the Vercel CDN URL

## Switching Between Providers

1. Change `STORAGE_PROVIDER` in `.env.local`
2. Restart the dev server
3. Files are not automatically migrated between providers

**Note**: Files uploaded with one provider won't be accessible with another. Use Vercel Blob for production data.
