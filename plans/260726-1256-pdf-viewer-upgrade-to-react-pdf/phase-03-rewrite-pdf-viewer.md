---
phase: 3
title: "Rewrite PdfViewer with react-pdf"
status: pending
priority: P2
effort: "1.5h"
dependencies: [1, 2]
---

# Phase 3: Rewrite PdfViewer with react-pdf

## Overview
Swap the `<iframe>`-based `PdfViewer` for a client-rendered `react-pdf` component. Keep the existing prop surface (`url`, `className`, `showControls`, `onClose`) so `content-panel.tsx` is untouched. The viewer consumes the URL returned by `getPassageSourceUrlAction` — which now points at `/api/blob`.

## Requirements

- Functional:
  - Render `<Document file={url}>` and `<Page pageNumber={pageNumber}>` from `react-pdf`.
  - Loading + error states (`error`) surfaced in the DOM.
  - Prev / Next page controls, page indicator, and Download link to the same `url` (i.e. `/api/blob?pathname=...`).
- Non-functional:
  - Component stays `"use client"` and imports the `react-pdf` CSS bundles.
  - Self-hosted pdfjs worker — no CDN.

## Architecture

```
content-panel.tsx (PdfViewer url=sourceUrl)
        │  sourceUrl = /api/blob?pathname=<encoded>
        ▼
PdfViewer ("use client")
        │  ── Document(url) ──────────► /api/blob?pathname=...
        │  ── <Page pageNumber={n} />
        ▼
pdfjs-dist worker (bundled, same-origin)
```

The new route from Phase 1 already validates session, looks up `Passage` by `filePath`, asserts ownership, and streams the blob with `Content-Type: application/pdf`. `react-pdf` calls `fetch(url)` once per `<Document>` mount and the worker handles rendering.

## Related Code Files

- Modify: `src/features/reading/components/pdf-viewer.tsx`
- Unchanged: `src/features/reading/components/content-panel.tsx` (still imports `PdfViewer`, passes `url={sourceUrl}`)
- Unchanged: `src/app/api/blob/route.ts`

## Implementation Steps

1. Replace the body of `src/features/reading/components/pdf-viewer.tsx`:
   - Keep `"use client"` and the existing `PdfViewerProps` interface.
   - Import `useState` from `react`; import `Document, Page, pdfjs` from `react-pdf`.
   - Import the two CSS bundles:
     ```ts
     import "react-pdf/dist/esm/Page/AnnotationLayer.css";
     import "react-pdf/dist/esm/Page/TextLayer.css";
     ```
   - Set `pdfjs.GlobalWorkerOptions.workerSrc` once at module load:
     ```ts
     // Bundled worker via Turbopack chunk (same-origin, CSP-safe).
     pdfjs.GlobalWorkerOptions.workerSrc = new URL(
       "pdfjs-dist/build/pdf.worker.min.mjs",
       import.meta.url,
     ).toString();
     ```
     Fallback (only if Turbopack rejects the URL form): copy worker into `public/pdf.worker.min.mjs` and use `/pdf.worker.min.mjs` here.
2. State: `numPages: number | null`, `pageNumber = 1`, `error: string | null`. `react-pdf`'s `loading` prop covers in-flight; no separate `isLoading`.
3. Render:
   - `<Document file={url} onLoadSuccess={({numPages}) => setNumPages(numPages)} onLoadError={(e) => setError(e.message)} loading={<p>Loading PDF…</p>}>`.
   - `<Page pageNumber={pageNumber} width={600} renderAnnotationLayer renderTextLayer />`.
   - Show error block when `error` is non-null.
   - Controls (visible when `numPages` is set and `showControls !== false`): Prev / page-of / Next / Download link `<a href={url} download>`.
   - Optional close button when `onClose` is provided.
4. Keep the existing wrapper `style={{ width: "100%", height: "100%" }}` so the call site's `className="min-h-[60vh]"` still works.
5. Match the file's existing comment density (1 doc block); no comment sprawl.

## Success Criteria

- [ ] `PdfViewer` renders page 1 on first paint after `url` resolves.
- [ ] Prev / Next buttons change page; indicator updates.
- [ ] Loading placeholder shown until `onLoadSuccess`.
- [ ] `onLoadError` (e.g., 401/404 from `/api/blob`) renders an error block, not a white screen.
- [ ] Download anchor hits `/api/blob?pathname=...` and saves the PDF.
- [ ] `content-panel.tsx` diff is zero.

## Risk Assessment

- **Worker bundling breaks under Turbopack:** if `new URL(..., import.meta.url)` returns an unresolved URL in dev, fall back to `public/pdf.worker.min.mjs`. Document the fallback in a code comment.
- **Large PDFs hang the worker:** `react-pdf` streams the document. If we see jank, add a manual scale slider in a follow-up — out of scope here.
- **CSP blocks the worker chunk:** bundled workers are same-origin, so they pass `worker-src 'self' blob:` already in `next.config.ts:50`. No CSP edit needed.
- **`onLoadError` swallows 401 as "missing PDF":** acceptable — same effective behavior as today's silent iframe `about:blank`.