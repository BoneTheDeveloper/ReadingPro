---
phase: 3
title: "App Shell & Dark Rail"
status: complete
priority: P1
effort: "4-6h"
dependencies: [2]
---

# Phase 3: App Shell & Dark Rail

## Overview

Restyle the shared chrome in `src/ui/layout/*` to the design.md §8 shell: a 62px **dark rail**
(`#221F2B`) with icon nav, warm-paper side panels (`#FBF9F5`) with 54px UPPERCASE headers, and a
pure-white reader region. This is the frame every dashboard page renders inside, so it lands before
per-page work.

## Requirements

- Functional: `dashboard-sidebar.tsx` becomes the 62px dark rail — 40px icon buttons (radius 13px),
  active item `rgba(255,255,255,.14)`, indigo gradient logo top, user avatar at bottom. Theme/language
  controls are NOT in the rail — they live in the sticky top bar (per layout decision 2026-06-22).
- Functional: Lucide icons as inline SVG (design.md §7 — do NOT call `lucide.createIcons()`; it
  mutates the DOM and crashes React). Use a React Lucide import or static SVGs.
- Functional: dashboard layout regions adopt panel chrome (warm paper, 54px header, UPPERCASE
  label, internal scroll via `.panel-scroll`).
- Non-functional: indigo appears only on the active nav item; `height:100vh; overflow:hidden` frame
  preserved (body already `h-full overflow-hidden`, `layout.tsx:52`).

## Architecture

The 3-panel layout (Rail / Sources / Reader / Studio) is the Study workspace; other dashboard pages
reuse the rail + content region. Keep layout composition in `src/ui/layout` and route group layouts
(`src/app/[locale]/(dashboard)/layout.tsx`); feature panels stay under `src/features/<feature>`
per page-composition-conventions.

## Related Code Files

- Modify: `src/ui/layout/dashboard-sidebar.tsx` — dark rail (no theme/language controls in rail; those are in the top bar)
- Modify: `src/ui/layout/theme-toggle.tsx`, `language-switcher.tsx`, `auth-controls.tsx` — used in the top bar (desktop) and mobile header
- Modify: `src/app/[locale]/(dashboard)/layout.tsx` — region backgrounds/scroll
- Read for spec: `docs/Design/design.md` §7 icons, §8 layout
- Read for structure: `docs/Architecture/frontend-ui-architecture/component-catalog.md` (layout),
  `page-composition-conventions.md` (Shared UI Rules, Region rules)

## Implementation Steps

1. Rebuild rail visuals in `dashboard-sidebar.tsx`: dark bg, 40px icon tiles, active-state bg,
   gradient logo, bottom avatar. Map nav icons to Lucide names in design.md §7.
2. Verify icon rendering path is React-safe (inline `<svg>` or `lucide-react`), not the DOM-mutating
   `createIcons()`.
3. Adjust theme-toggle / language-switcher / auth-controls to sit in the dark rail (contrast,
   sizing).
4. In the dashboard route-group layout, set panel backgrounds (paper/panel/surface), 54px headers,
   UPPERCASE section labels, `.panel-scroll` on scroll regions.
5. `pnpm run typecheck && pnpm run lint`; run app, confirm rail + panels render and nav active state
   tracks the current route.

## Success Criteria

- [ ] Dark rail renders at 62px with icon nav; active item highlighted, only-active is indigo-ish.
- [ ] No runtime crash from icon library (React-safe rendering confirmed).
- [ ] Side panels are warm paper with 54px UPPERCASE headers; reader region pure white.
- [ ] App frame stays full-height, no double scrollbars.
- [ ] typecheck + lint clean.

## Risk Assessment

- **`lucide.createIcons()` crash** (called out in design.md §7) → use React/inline SVG; grep to
  ensure no `createIcons` call sneaks in.
- **Rail layout shift across breakpoints** → verify the existing responsive/collapse behavior still
  works; the rail is fixed-width, content flexes.
- **theme-toggle contrast on dark rail** → ensure toggle/avatar legible against `#221F2B`.
