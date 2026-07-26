---
phase: 2
title: "Install react-pdf + pdfjs-dist"
status: pending
priority: P2
effort: "30m"
dependencies: []
---

# Phase 2: Install react-pdf + pdfjs-dist

## Overview
Add `react-pdf` and `pdfjs-dist` as runtime dependencies and confirm the pdfjs worker path resolves at runtime without violating CSP.

## Requirements

- Functional:
  - `react-pdf` and `pdfjs-dist` available as runtime imports.
  - `pdfjs.GlobalWorkerOptions.workerSrc` resolves same-origin (no CSP edit needed).
- Non-functional:
  - Lockfile updated; no peer-dep warnings that block `pnpm install`.

## Architecture

`react-pdf` is a thin React wrapper around `pdfjs-dist`. It needs a web worker URL. We bundle the worker via Turbopack/Webpack with `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)` — served from the same origin, no CSP change.

## Related Code Files

- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (auto)
- No source edits in this phase.

## Implementation Steps

1. `pnpm add react-pdf pdfjs-dist`.
2. Verify `node_modules/pdfjs-dist/build/pdf.worker.min.mjs` exists.
3. `pnpm typecheck` (no import yet; just confirm types resolve once `package.json` updates).

## Success Criteria

- [ ] `package.json` lists `react-pdf` and `pdfjs-dist` under `dependencies`.
- [ ] `pnpm typecheck` still passes.
- [ ] `pdfjs-dist/build/pdf.worker.min.mjs` is present locally.

## Risk Assessment

- **Peer-dep mismatch with React 19.2.6:** `react-pdf` v9 targets React 18/19. If install fails on peer deps, pin `react-pdf@^9.x` and re-run; document any `--legacy-peer-deps` requirement in the PR body.
- **Turbopack worker bundling quirks:** `new URL(..., import.meta.url)` works under Next 14+. If a chunk-404 surfaces in dev, fall back to copying the worker into `public/pdf.worker.min.mjs` and using `/pdf.worker.min.mjs` as `workerSrc`. Phase 3 makes that call.