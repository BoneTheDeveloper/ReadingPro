# Incident Debugging

## First Checks

1. Confirm affected environment: local, preview, or production.
2. Check Vercel function logs for route, method, request id, and error message.
3. Check Sentry issue/event and trace spans.
4. Identify whether the failure is auth, DB, storage, AI/provider, or frontend rendering.

## Route Debugging

- Search for route tag in Sentry, for example `route:api:translate`.
- Use Pino request context fields: `path`, `method`, `requestId`.
- For Prisma errors, check compacted error message and migration state.
- For auth failures, verify Clerk keys and session state.

## Data Debugging

- Verify `userId` ownership filters.
- Check `deletedAt` on passages.
- Check Neon branch/environment.
- Check migration status before assuming code regression.

## Storage Debugging

- Local: inspect `.local-blob-storage/`.
- Preview/production: verify `BLOB_READ_WRITE_TOKEN` and Blob store environment.
- Never expose private blob access without auth and ownership checks.
