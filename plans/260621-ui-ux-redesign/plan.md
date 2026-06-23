---
title: "UI/UX Redesign — Indigo/Coral Study Workspace"
description: ""
status: in_progress
priority: P2
branch: "redesign-branch-new-ui"
tags: []
blockedBy: []
blocks: []
created: "2026-06-22T08:08:51.078Z"
createdBy: "ck:plan"
source: skill
---

# UI/UX Redesign — Indigo/Coral Study Workspace

## Overview

Migrate the app's visual system from the current **Navy + Gold / Inter + Literata** theme to the
new **Indigo + Coral / Plus Jakarta Sans + Lora** "Study Workspace" system defined in
[`docs/Design/design.md`](../../docs/Design/design.md). Visual targets are the per-page wireframes in
[`docs/Design/wireframes/`](../../docs/Design/wireframes/):
- [`Study Workspace.dc.html`](../../docs/Design/wireframes/Study%20Workspace.dc.html)
- [`Vocabulary.dc.html`](../../docs/Design/wireframes/Vocabulary.dc.html)
- [`Dictionary.dc.html`](../../docs/Design/wireframes/Dictionary.dc.html)

This is a **token migration, not a rebuild.** `src/app/globals.css` already exposes a full
semantic token layer via `@theme inline`, and primitives (`src/ui/primitives/*`) already consume
semantic classes (`bg-primary`, `text-primary-foreground`, `--radius`, CEFR vars). Recoloring the
tokens propagates automatically; primitives and pages only need the deltas the new system adds
(tinted button shadows, lift-on-press, learning-status badges, the dark rail, panel chrome).

**Strategy: foundation-first.** Tokens (P1) → primitives (P2) → app shell (P3) → pages (P4).
Never restyle a page before its primitives, or a primitive before its token — otherwise the same
surface gets touched twice.

> ⚠️ **`design.md` is still being edited.** Phase 1 ports the *current* token values. When the doc
> is finalized, re-run a token diff against `globals.css` before starting Phase 2. Treat Phase 1
> values as provisional until the user confirms the doc is locked.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Design Tokens & Fonts](./phase-01-design-tokens-fonts.md) | Complete |
| 2 | [Restyle UI Primitives](./phase-02-restyle-ui-primitives.md) | Complete |
| 3 | [App Shell & Dark Rail](./phase-03-app-shell-dark-rail.md) | Complete |
| 4 | [Page Restyle Per Route](./phase-04-page-restyle-per-route.md) | Complete |
| 5 | [Dark Mode Reconcile](./phase-05-dark-mode-reconcile.md) | **Deferred** (light-only ship) |
| 6 | [Visual QA vs Wireframes](./phase-06-visual-qa-vs-wireframes.md) | Complete |

## Dependencies

- No cross-plan blockers. `260621-issue-67-translation-vocab-store` touches vocabulary
  data/contracts, not visual tokens — no file overlap with this plan's CSS/UI work.
- External input: `docs/Design/design.md` must be finalized before Phase 2 (see Overview warning).
- Wireframes cover Study Workspace, Vocabulary, Dictionary only — (auth), upload, processing, and
  progress pages have no wireframe; use `design.md` tokens + conventions for those.

## Key Facts (verified against code)

- Tokens live in `src/app/globals.css` — `@theme inline` (Tailwind v4 token map) + `:root`
  (light) + `.dark` (dark). One file owns the whole palette.
- Fonts wired in `src/app/[locale]/layout.tsx:5` via `next/font/google`
  (`Inter`→`--font-inter`, `Literata`→`--font-literata`, `JetBrains_Mono`→`--font-jetbrains-mono`),
  consumed by `@theme` font vars in `globals.css:11-13`.
- 14 primitives in `src/ui/primitives/`. `button.tsx` uses `cva` + semantic classes — recolor is
  automatic; only new behaviors (tinted shadow, lift) are manual.
- App-shell chrome in `src/ui/layout/` (`dashboard-sidebar.tsx` → becomes the 62px dark rail).
- Reading typography hook: `.reading-content` in `globals.css:263`, used by
  `src/features/study/ui/studio/content/content-panel.tsx`.
- Routes: `(auth)` sign-in/up; `(dashboard)` upload, processing, study, vocabulary, dictionary,
  progress.
