---
phase: 6
title: "Visual QA vs Wireframes"
status: pending
priority: P2
effort: "3-5h"
dependencies: [5]
---

# Phase 6: Visual QA vs Wireframes

## Overview

Verify the running app against `wireframes/wireframes.html` route by route, light and dark, fix the
deltas, and update docs so the design system stays the single source of truth.

## Requirements

- Functional: each route screenshot is faithful to its wireframe (layout, color, type, spacing).
  **Light mode only** — dark mode QA is deferred with Phase 5.
- Functional: regression suite green (`pnpm run test`); no behavior changed by the restyle.
- Non-functional: docs updated to reflect the shipped system (component-catalog, page docs).

## Architecture

Use the `/run` or `/verify` skill (or `agent-browser` / Playwright) to launch the app and capture
screenshots per route in both themes, comparing to the wireframe HTML opened side by side. This is
verification + doc sync, not new styling — styling fixes are small deltas back into P2/P4 files.

## Related Code Files

- Verify (no structural change): all routes + primitives
- Modify if drift found: the specific P2/P4 file responsible
- Modify (doc sync): `docs/Architecture/frontend-ui-architecture/component-catalog.md`,
  `docs/Architecture/frontend-ui-architecture/pages/*`, `docs/Product/changelog.md`
- Read (wireframed routes): `docs/Design/wireframes/Study Workspace.dc.html`,
  `docs/Design/wireframes/Vocabulary.dc.html`, `docs/Design/wireframes/Dictionary.dc.html`

## Implementation Steps

1. Launch app (`/run`). Screenshot each route in LIGHT mode and compare:
   - Study workspace vs `docs/Design/wireframes/Study Workspace.dc.html`
   - Vocabulary vs `docs/Design/wireframes/Vocabulary.dc.html`
   - Dictionary vs `docs/Design/wireframes/Dictionary.dc.html`
   - (auth), upload, processing, progress — no wireframe; validate against `design.md` tokens.
   (Dark QA deferred — see Phase 5.)
2. Log deltas; fix each in the owning primitive/feature file (small diffs).
3. `pnpm run test` — fix any visual/selector regressions properly (no deleting assertions).
4. Update component-catalog + affected page docs to describe the shipped look; add a changelog
   entry. Confirm `design.md` is finalized and remains the token SSoT.
5. Final `pnpm run typecheck && pnpm run lint && pnpm run test`.

## Success Criteria

- [ ] Every route matches its wireframe in LIGHT mode, deltas resolved (dark deferred to Phase 5).
- [ ] `pnpm run test` green; no behavioral regressions.
- [ ] Docs (component-catalog, page docs, changelog) updated.
- [ ] Final typecheck + lint + test all clean.

## Risk Assessment

- **Pixel-chasing the wireframe** → match intent (system, spacing rhythm, color), not exact pixels;
  the wireframe is a guide, design.md is the contract.
- **Late-discovered token gaps** → if a fix needs a new token, add it in `globals.css` (P1 layer),
  not as a one-off inline value, to keep SSoT.
- **Test breakage from markup changes** → update selectors with the change; never weaken assertions
  to pass.
