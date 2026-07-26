---
phase: 1
title: "Add /api/blob route"
status: pending
priority: P2
effort: "45m"
dependencies: []
---

# Phase 1: Add /api/blob route

## Overview
Create a new authenticated blob delivery route at `src/app/api/blob/route.ts` that mirrors the auth + ownership + streaming behavior of `src/app/api/storage/source/route.ts`. Switch `getViewableUrl` in `src/lib/storage/blob.ts` to point at the new path.

## Requirements

- Functional:
  - `GET /api/blob?pathname=<encoded>` returns the private blob stream for the owning user.
  - 401 when no session, 400 when `pathname` missing, 404 when no `Passage` references the path, 403 when the passage belongs to another user, 502 when the blob fetch fails.
- Non-functional:
  - Same response headers as the old route (`Content-Type`, `Content-Length`, `X-Content-Type-Options`, `Cache-Control: private, max-age=300`).
  - Better Auth used — not Clerk.

## Architecture

```
content-panel.tsx (PdfViewer url=sourceUrl)
        │  sourceUrl = getViewableUrl(passage.filePath)
        ▼
getPassageSourceUrlAction (passage-crud)
        │  getViewableUrl(pathname) → "/api/blob?pathname=<encoded>"
        ▼
GET /api/blob?pathname=<encoded>
        │  Better Auth → prisma.passage.findUnique({ where: { filePath }})
        │  → ownership check → get(pathname, { access: "private" })
        ▼
Stream to browser
```

The route is a near-verbatim copy of `src/app/api/storage/source/route.ts`, only the URL changes. The `contentTypeFor` helper and the `CONTENT_TYPE_BY_EXTENSION` map move with it.

## Related Code Files

- Create: `src/app/api/blob/route.ts`
- Modify: `src/lib/storage/blob.ts` (update `getViewableUrl` to return `/api/blob?pathname=...`)
- Unchanged: `src/features/passage-crud/server/actions/passage.ts` (still calls `getViewableUrl`)
- Unchanged: `src/features/reading/components/content-panel.tsx`
- Unchanged (until Phase 4): `src/app/api/storage/source/route.ts`

## Implementation Steps

1. Create `src/app/api/blob/route.ts`. Copy the body of `src/app/api/storage/source/route.ts` verbatim — `CONTENT_TYPE_BY_EXTENSION`, `contentTypeFor`, the `GET` handler with its auth + ownership checks + `get(pathname, { access: "private" })` + headers. Update the leading doc comment to reference the new path and `getViewableUrl`.
2. Edit `src/lib/storage/blob.ts`:
   ```ts
   export function getViewableUrl(pathname: string): string {
     return `/api/blob?pathname=${encodeURIComponent(pathname)}`;
   }
   ```
3. Verify with `pnpm typecheck`.

## Success Criteria

- [ ] `src/app/api/blob/route.ts` exists with the same exports and behavior as the old route.
- [ ] `getViewableUrl` returns `/api/blob?pathname=<encoded>`.
- [ ] `pnpm typecheck` green.

## Risk Assessment

- **No real route call yet:** the route exists but the viewer still uses the old `<iframe>` and `PdfViewer` still passes the URL through unchanged; nothing references `/api/blob` until Phase 4 retires the old route. Acceptable — it's an additive change.
- **Duplicate logic with old route:** intentional for the duration of the plan; Phase 4 deletes the old route to keep one source of truth.
- **`Cache-Control` drift:** keep `private, max-age=300` to match the old route; do **not** copy the user's `max-age=3600` (the old value is the established convention here).