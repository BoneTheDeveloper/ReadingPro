---
phase: 1
title: "Theme Design Tokens"
status: complete
priority: P2
effort: "3h"
dependencies: []
---

# Phase 1: Theme Design Tokens

## Overview

Create the dark-mode design foundation before implementation. The output is a token spec and CSS variable mapping that keeps dark mode calm, readable, and editorial.

## Requirements

- Functional: define `.dark` values for all active shadcn/Tailwind variables in `src/app/globals.css`.
- Functional: include reading-specific, sidebar, popover, input, chart, success, danger, gold, and CEFR mappings.
- Non-functional: meet WCAG AA contrast for normal UI text and long reading content.
- Non-functional: avoid neon, high-saturation surfaces, and one-note dark blue/slate dominance.

## Architecture

Keep the theme architecture CSS-variable based:

- `:root` remains the light token source.
- `.dark` overrides the same variables.
- Tailwind classes keep using semantic tokens like `bg-background`, `text-foreground`, `bg-primary`, `border-border`.
- `docs/Design/darkmode-color-design.md` documents exact dark token values and usage rules.

## Related Code Files

- Create: `docs/Design/darkmode-color-design.md`
- Modify: `src/app/globals.css`
- Modify: `docs/Design/styling-guide.md`
- Do not modify: `src/components/ui/*` primitives

## Implementation Steps

1. Add `docs/Design/darkmode-color-design.md` with the approved dark palette.
2. Add `.dark` token overrides in `src/app/globals.css`.
3. Update scrollbar colors and skeleton colors to use variables instead of hardcoded black alpha.
4. Update `docs/Design/styling-guide.md` so token docs match current `globals.css`.
5. Run focused visual checks on dashboard, study workspace, reading view, test flow, auth pages.

## Success Criteria

- [x] All semantic tokens have dark-mode values.
- [x] No hardcoded light-only surface colors remain in common UI paths.
- [x] Reading content is comfortable for long sessions.
- [x] Sidebar, popovers, dropdowns, and inputs are distinct from the page background.
- [x] Light mode remains visually unchanged except for documented token cleanup.

## Risk Assessment

Risk: token changes may make existing subtle borders disappear.
Mitigation: validate panels and cards in dashboard/study/test screens with screenshots.

Risk: CEFR colors can become too bright in dark mode.
Mitigation: keep CEFR values as semantic accents and use soft backgrounds for badges only.
