---
title: "PDF Viewer Upgrade to react-pdf"
description: "Add /api/blob route, swap iframe-based PdfViewer for react-pdf renderer, retire the old /api/storage/source route."
status: pending
priority: P2
effort: "3.5h"
tags: []
created: 2026-07-26
---

# PDF Viewer Upgrade to react-pdf

## Overview

Add a new authenticated blob delivery route at `src/app/api/blob/route.ts` (path requested by the user; Better Auth + ownership via `Passage.filePath` + private `get(pathname, { access: "private" })`, same semantics as the existing `/api/storage/source` route). Point `getViewableUrl` at it. Replace the `<iframe>`-based `PdfViewer` with a `react-pdf` renderer that consumes the new URL. Retire the now-unused `/api/storage/source` route once nothing references it.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | New `GET /api/blob?pathname=<encoded>` route streams owned private PDFs | P2 |
| 2 | `PdfViewer` renders via `react-pdf` with page navigation controls | P2 |
| 3 | Self-host the pdfjs worker (CSP unchanged, no `cdnjs.cloudflare.com`) | P2 |
| 4 | Old `/api/storage/source` route and file deleted | P2 |
| 5 | `getViewableUrl` returns the new `/api/blob` URL | P2 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Phase 1: Add /api/blob route](./phase-01-add-api-blob-route.md) | Pending |
| 2 | [Phase 2: Install react-pdf + pdfjs-dist](./phase-02-install-react-pdf.md) | Pending |
| 3 | [Phase 3: Rewrite PdfViewer with react-pdf](./phase-03-rewrite-pdf-viewer.md) | Pending |
| 4 | [Phase 4: Retire /api/storage/source + verify](./phase-04-retire-old-route.md) | Pending |

## Success Criteria

- [ ] `GET /api/blob?pathname=uploads/<userId>/<passageId>.pdf` returns 200 with `Content-Type: application/pdf` for the owning user; 401 / 404 / 403 otherwise.
- [ ] `getViewableUrl(pathname)` returns `/api/blob?pathname=<encoded>`.
- [ ] `pnpm typecheck && pnpm lint && pnpm knip && pnpm build` all green.
- [ ] Opening a PDF passage renders page 1 via `react-pdf`; Prev/Next/indicator work.
- [ ] No network requests to `cdnjs.cloudflare.com`.
- [ ] `src/app/api/storage/` directory deleted; no remaining imports under `src/`.
- [ ] `PdfViewer` props (`url`, `className`, `showControls`, `onClose`) still accepted (back-compat with `content-panel.tsx`).

## Reference

- Current viewer: `src/features/reading/components/pdf-viewer.tsx`
- Current source URL builder: `src/lib/storage/blob.ts` (`getViewableUrl`)
- Route being retired: `src/app/api/storage/source/route.ts`
- Call site for source URL: `src/features/passage-crud/server/actions/passage.ts:18`
- Call site for viewer: `src/features/reading/components/content-panel.tsx:191`
- Earlier plan that shipped private blob delivery at the old path: `plans/260726-1235-direct-pdf-upload/plan.md`

## Notes / divergences from the user's snippet

- The pasted snippet's step 1 (`/api/blob/route.ts`) is **not** redundant here — this repo has an equivalent at `src/app/api/storage/source/route.ts`, but the user explicitly asked for the new path. We add the new route, swap the URL builder, and retire the old one.
- The pasted snippet uses Clerk's `auth()`. This repo uses Better Auth (`src/lib/auth/auth.ts` → `auth.api.getSession`). The new route uses Better Auth, matching the existing one.
- The pasted snippet points `pdfjs.GlobalWorkerOptions.workerSrc` at `cdnjs.cloudflare.com`. CSP does not whitelist that host. Phase 2 self-hosts the worker via `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)` so the bundled worker is served same-origin.
- The user's snippet ignores `showControls` / `onClose`. The current `PdfViewerProps` advertises both; the call site only passes `url` + `className`. Plan keeps the props for back-compat.