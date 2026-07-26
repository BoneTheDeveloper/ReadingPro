---
phase: 4
title: "Retire /api/storage/source and verify"
status: pending
priority: P2
effort: "30m"
dependencies: [3]
---

# Phase 4: Retire /api/storage/source and verify

## Overview
Delete the old `src/app/api/storage/source/route.ts` and the `src/app/api/storage/` directory once `getViewableUrl` and the new route are wired. Run the verification gate.

## Requirements

- Functional:
  - `git grep -nE "/api/storage/source" src/` returns empty.
  - `src/app/api/storage/` directory removed.
- Non-functional:
  - `pnpm typecheck && pnpm lint && pnpm knip && pnpm build` all green.
  - No new CSP entries.
  - No `cdnjs.cloudflare.com` traffic.

## Related Code Files

- Delete: `src/app/api/storage/source/route.ts`
- Delete: `src/app/api/storage/` directory (if no other files remain)
- No source edits expected beyond deletions.

## Implementation Steps

1. `git grep -nE "/api/storage/source" src/` — confirm no remaining references. (Earlier scout showed only `src/lib/storage/blob.ts` referenced it, and that's now repointed.)
2. If `src/app/api/storage/` contains only `source/route.ts`, delete the whole directory. Otherwise, delete only `source/route.ts` and leave a note.
3. `pnpm typecheck`.
4. `pnpm lint`.
5. `pnpm knip` — confirm no orphans. If `react-pdf` CSS side-effect imports trip the unused-file rule, suppress under `knip#ignore` or annotate.
6. `pnpm build` — confirm the pdfjs worker chunk is emitted (same-origin hashed chunk under `/_next/static/...`).
7. Manual smoke (dev server + an existing PDF passage):
   - Open the study workspace, select a PDF passage, switch to the "PDF" tab.
   - DevTools → Network: confirm GET `/api/blob?pathname=...` returns 200 with `Content-Type: application/pdf` and a streaming body.
   - Confirm one chunk under `/_next/static/...` for the pdfjs worker (same-origin, not cdnjs).
   - Click Next twice — observe two `<canvas>` paints.
   - DevTools → Console: no CSP violations.
   - Log out and re-GET the URL — expect 401.

## Success Criteria

- [ ] All four checks green.
- [ ] No CSP violations in the browser console when loading a PDF.
- [ ] `/api/storage/source` no longer exists; nothing references the path.
- [ ] Auth + ownership on `/api/blob` unchanged from Phase 1 (manual 401/404 check).

## Risk Assessment

- **`knip` flags unused exports:** the `pdfjs` re-export is used; CSS side-effect imports may trip unused-file checks. Mitigation: annotate.
- **Turbopack vs Webpack worker chunk paths:** dev (Turbopack) and prod (Webpack) hash the chunk differently. Both work; just confirm in both modes during smoke.
- **Other `<iframe>` callers stay untouched:** grep showed only the YouTube embed uses `<iframe>`. Out of scope.