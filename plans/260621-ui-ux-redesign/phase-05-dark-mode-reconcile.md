---
phase: 5
title: "Dark Mode Reconcile (DEFERRED)"
status: deferred
priority: P3
effort: "3-4h"
dependencies: [4]
---

# Phase 5: Dark Mode Reconcile (DEFERRED)

> 🅿️ **Parked by user decision.** The redesign ships **light-only** (Phases 1–4, 6). Dark mode is
> not touched during those phases — the `.dark` block in `globals.css` keeps its old values and
> `docs/Design/design.dark.md` stays a placeholder ("finish after phase 5 of the plan"). Pick this
> phase up later when dark mode becomes a priority. Until then, dark mode will look half-migrated;
> that is accepted.

## Overview

**Derive a NEW Indigo/Coral dark palette from the Phase-1 light tokens, then write it back into
`docs/Design/design.dark.md` as the canonical dark spec.** `design.dark.md` is currently STALE — it
documents the retired Navy/Gold system and its values match the *old* `.dark` block. Do NOT
reconcile against it. Doc follows implementation here: derive → verify → update the doc.

## Requirements

- Functional: derive `.dark` values in `globals.css` from the new light Indigo/Coral tokens
  (lift/desaturate brand colors for dark surfaces, warm-charcoal neutrals per the still-valid
  Design Goal/Principles in `design.dark.md`).
- Functional: rewrite `design.dark.md` token block to match the derived `.dark` block; remove the
  stale banner once it reflects the new system.
- Functional: contrast holds for indigo/coral on dark surfaces (buttons, badges, active rail item,
  reader text).
- Non-functional: token-name parity between `:root` and `.dark` (every var defined in both).

## Architecture

`.dark` is a class-scoped override of the same var names (`@custom-variant dark`,
`globals.css:5`). The theme toggle (`src/ui/layout/theme-toggle.tsx`) flips the `.dark` class. No
new mechanism — only value reconciliation + visual verification.

## Related Code Files

- Modify: `src/app/globals.css` `.dark` block (derive new values)
- Modify: `docs/Design/design.dark.md` (rewrite token block to match; remove stale banner)
- Read for intent (not values): `docs/Design/design.dark.md` Design Goal + Principles (still valid)
- Read for source values: the new light tokens in `globals.css` `:root` (post Phase 1)
- Verify: `src/ui/layout/theme-toggle.tsx` still toggles correctly

## Implementation Steps

1. For each new light token, derive its dark counterpart: warm-charcoal neutrals, brand indigo/coral
   lifted/desaturated for legibility on dark, soft-bg/text pairs inverted. Follow the Design Goal +
   Principles in `design.dark.md` (those are valid; only the old hexes are obsolete).
2. Confirm every `:root` var has a `.dark` counterpart (name parity).
3. Toggle dark mode and walk each route group + primitives sampler.
4. Check the dark rail (already dark) reads correctly against the dark page background — it must
   still feel like an anchor, not blend in.
5. Rewrite the `design.dark.md` token block to match the derived `.dark` block and delete the stale
   banner so the doc is canonical again.
6. `pnpm run typecheck && pnpm run lint`.

## Success Criteria

- [ ] `.dark` is a coherent Indigo/Coral dark palette derived from the new light tokens (NOT the old
      Navy/Gold values).
- [ ] `design.dark.md` rewritten to match `.dark`; stale banner removed.
- [ ] All routes legible and on-brand in dark mode (no unreadable indigo/coral, no white flashes).
- [ ] Token name parity between `:root` and `.dark`.
- [ ] typecheck + lint clean.

## Risk Assessment

- **Accidentally reconciling against the stale doc** → the doc's hexes are old; derive from light
  tokens, use the doc only for Goal/Principles. Banner guards against this until step 5 rewrites it.
- **`design.md` still in flux** → if the light doc moves, dark derivation moves too; do this phase
  after light tokens are locked.
- **Low contrast for soft accents on dark** → adjust soft-bg/text pairs; favor legibility over a
  mechanical derivation if it fails contrast.
