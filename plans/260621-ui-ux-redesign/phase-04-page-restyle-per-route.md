---
phase: 4
title: "Page Restyle Per Route"
status: pending
priority: P2
effort: "1-2d"
dependencies: [3]
---

# Phase 4: Page Restyle Per Route

## Overview

Restyle each route's feature components to match the wireframes, one route group at a time, on top
of the now-correct tokens (P1), primitives (P2), and shell (P3). Mostly composition/spacing work —
the look comes from primitives; pages arrange them per `wireframes.html`.

## Requirements

- Functional: wireframed pages match their target (layout, spacing, empty/loading/error states):
  - Study workspace → `docs/Design/wireframes/Study Workspace.dc.html`
  - Vocabulary → `docs/Design/wireframes/Vocabulary.dc.html`
  - Dictionary → `docs/Design/wireframes/Dictionary.dc.html`
  - (auth), upload, processing, progress — no wireframe; use `design.md` tokens + conventions.
- Functional: Study workspace gets the full 3-panel treatment (Sources / Reader / Studio); the
  reader uses `.reading-content` (Lora) and the indigo→coral progress bar.
- Non-functional: keep feature UI under `src/features/<feature>/ui`; page clients stay region
  composers (page-composition-conventions). No business-logic changes — visual only.

## Architecture

Per page-composition-conventions: `page.tsx` (thin) → `*PageClient` (region composer) → feature
components → primitives. Restyle feature components; avoid moving state or fetch logic. Order pages
low-risk → high-risk.

Route inventory (`src/app/[locale]/`):
- `(auth)`: sign-in, sign-up — simplest, do first to validate the pipeline
- `(dashboard)`: upload, processing, progress, dictionary, vocabulary, study (most complex, last)

## Related Code Files

- Modify: `src/features/upload/ui/*`, `src/features/study/ui/**`, `src/features/vocabulary/ui/*`,
  `src/features/dictionary/ui/*`, `src/features/progress/ui/*`
- Modify: route `page.tsx` / `*-page-client.tsx` only for region layout, not data flow
- Read for spec (wireframed routes): `docs/Design/wireframes/Study Workspace.dc.html`,
  `docs/Design/wireframes/Vocabulary.dc.html`, `docs/Design/wireframes/Dictionary.dc.html`
- Read for spec (non-wireframed routes): `docs/Design/design.md`
- Read for per-page contract: `docs/Architecture/frontend-ui-architecture/pages/*`

## Implementation Steps

1. **(auth)** sign-in / sign-up — restyle first as a pipeline smoke test (small surface).
2. **upload** + **processing** — upload zone, file rows, processing/progress animation
   (`upload-fill`/`upload-shimmer` keyframes already in `globals.css`).
3. **progress** + **dictionary** — cards, charts (chart-* tokens already themed), entry cards.
4. **vocabulary** — list + set list, status badges (learning/known/new from P2).
5. **study** — full 3-panel workspace: SourcesPanel, ContentPanel (`.reading-content`, progress
   bar, meta bar), StudioPanel. Reference: `docs/Design/wireframes/Study Workspace.dc.html`.
   Highest effort; do last.
6. Per page: `pnpm run typecheck && pnpm run lint`, then screenshot vs the matching wireframe.

## Success Criteria

- [ ] Each route visually matches its wireframe (verified by screenshot in Phase 6).
- [ ] Study reader renders Lora content + indigo→coral progress bar + meta bar.
- [ ] Empty/loading/error states styled, not just the happy path.
- [ ] No data-flow / state regressions (existing tests still green).
- [ ] typecheck + lint clean per route group.

## Risk Assessment

- **Scope creep into logic** → visual-only; if a layout needs new state, note it, don't silently
  refactor data flow.
- **Study workspace complexity** → isolate to its own commit; it's the largest surface.
- **Wireframe vs implemented-feature drift** → if a wireframe shows a feature that doesn't exist in
  code, flag to user rather than building new functionality under a "redesign" plan.
- **Existing tests asserting old classes/markup** → update test selectors alongside (coordinate
  with `tests/`), don't delete assertions to go green.
