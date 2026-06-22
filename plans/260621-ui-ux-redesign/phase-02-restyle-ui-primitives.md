---
phase: 2
title: "Restyle UI Primitives"
status: pending
priority: P1
effort: "4-6h"
dependencies: [1]
---

# Phase 2: Restyle UI Primitives

## Overview

Apply the new-system *behaviors and shapes* that token recoloring alone can't deliver: tinted
button shadows + lift-on-press, the new radius scale (button 14px), badge/chip variants (CEFR +
learning status), and input/card surface treatment. Touch the 14 primitives in
`src/ui/primitives/`; do not change page code.

## Requirements

- Functional: Button gains design.md §5 behavior — tinted shadow per variant (indigo/coral),
  `translateY(-1px)` hover lift, `translateY(1px)` press sink, secondary = white + border→indigo on
  hover. (Press sink already exists at `button.tsx:7` `active:...translate-y-px` — keep, add lift +
  shadow.)
- Functional: Badge gains CEFR variants (a1–c2) and a learning-status variant (new/learning/known)
  with leading dot, per design.md §6.
- Functional: Chip pattern (filter/related) — pill, border, indigo-active. Add to `badge.tsx` or a
  small new primitive only if reused (KISS: extend badge first).
- Non-functional: keep `cva` + `data-slot` + `cn` conventions (component-catalog rules); export
  variant maps; no new dependency.

## Architecture

Primitives wrap Base UI + Tailwind, variants via `cva`. Recoloring came free in Phase 1; here we
add `boxShadow` and `transform` utilities and new `variant` keys. Radius: design.md wants 14px
buttons — current `--radius: 1rem` (16px) with `rounded-lg`. Align `--radius` or the button's
rounding to 14px; decide in step 1 and apply consistently.

## Related Code Files

- Modify: `src/ui/primitives/button.tsx` — add shadow/lift to variant map; verify radius
- Modify: `src/ui/primitives/badge.tsx` — CEFR + learning-status + chip variants
- Modify: `src/ui/primitives/input.tsx`, `card.tsx` — surface/border/radius per §3-4
- Review (recolor likely sufficient): `dialog`, `dropdown-menu`, `tabs`, `tooltip`, `progress`,
  `avatar`, `separator`, `scroll-area`, `sheet`, `textarea`
- Read for spec: `docs/Design/design.md` §3 radius, §4 shadows, §5 buttons, §6 badges/chips
- Read for rules: `docs/Architecture/frontend-ui-architecture/component-catalog.md`

## Implementation Steps

1. Decide radius: set standard button to 14px (per §5). Either adjust `--radius` or button class.
2. Button: add per-variant tinted `shadow-[...]` + `hover:-translate-y-px` (lift). Map default→
   indigo shadow, destructive→coral shadow, secondary→subtle card shadow + indigo hover border.
3. Badge: add CEFR a1–c2 variants (bg/text from §6 table) and `new`/`learning`/`known` status
   variants rendering a leading dot. Export `badgeVariants`.
4. Chip: extend badge with a `chip` variant (pill, border, white bg, indigo when active) — only if
   a second consumer exists; otherwise defer.
5. Input/Card: confirm radius (input ~10-11px, card 12-16px) and border/shadow tokens match §3-4.
6. Sweep remaining primitives — most need nothing beyond Phase-1 tokens; fix only visible misses.
7. `pnpm run typecheck && pnpm run lint`. Render a primitives sampler (Storybook-less: a scratch
   route or the existing dashboard) to eyeball.

## Success Criteria

- [ ] Primary/danger buttons show color-tinted shadow + lift on hover + sink on press.
- [ ] Secondary button is white with border/text → indigo on hover.
- [ ] CEFR badges and new/learning/known status badges render per design.md §6.
- [ ] All primitives follow `cva`/`data-slot`/`cn` conventions; variant maps exported.
- [ ] typecheck + lint clean.

## Risk Assessment

- **Radius ambiguity (16px token vs 14px button)** → pick one source of truth in step 1; document
  in the component-catalog if `--radius` changes meaning.
- **Over-restyling primitives that only needed recolor** → review-then-edit; default to leaving a
  primitive untouched if Phase 1 already made it correct (YAGNI).
- **Tailwind v4 arbitrary shadow values** verbose → consider a `--shadow-indigo` token in Phase 1
  if repeated, to keep classes readable (DRY).
