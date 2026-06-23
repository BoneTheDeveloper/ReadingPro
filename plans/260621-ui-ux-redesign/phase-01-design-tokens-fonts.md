---
phase: 1
title: "Design Tokens & Fonts"
status: complete
priority: P1
effort: "3-4h"
dependencies: []
---

# Phase 1: Design Tokens & Fonts

## Overview

Migrate the global token layer and fonts in place: recolor `globals.css` from Navy/Gold to
Indigo/Coral and swap Inter/Literata for Plus Jakarta Sans/Lora. This is the foundation — every
later phase reads these tokens. No component markup changes here.

## Requirements

- Functional: every existing semantic token (`--primary`, `--secondary`, `--accent`, `--border`,
  CEFR a1–c2, success/danger, sidebar.*) keeps its name but takes the new value from `design.md`.
- Functional: add tokens the new system introduces but the file lacks — coral accent, indigo-soft
  / coral-soft surfaces, learning-status (new/learning/known) dot+bg+text, tinted button-shadow
  values, the dark "rail" anchor (`--rail #221F2B`).
- Non-functional: keep names stable so primitives recolor automatically; do not break the
  `@theme inline` → `var(--x)` wiring. **Light only — do NOT touch the `.dark` block** (dark mode is
  deferred to Phase 5). Keep token NAMES stable so the existing `.dark` block keeps resolving.

## Architecture

Token flow (unchanged): `next/font` → CSS var → `@theme inline` maps to `--color-*` / `--font-*`
→ Tailwind utility classes → primitives. We change *values* and *add* tokens; we do not change the
mechanism.

`design.md` palette to apply (light):
- `--primary #5A4FE0` (indigo), `--primary-foreground #FFFFFF`, hover `#4A3FD0`
- accent/coral `#F2664A`, soft `#FCE7E1`, text-on-soft `#C8442B`
- `--success #2FA66A` soft `#DDF3E7`; `--amber #EEA63C` soft `#FBEFD8`
- neutrals: paper `#F5F2EC`, panel `#FBF9F5`, surface `#FFFFFF`, border `#EAE5DB`, rail `#221F2B`
- text: ink `#221F2B`, ink-2 `#565160`, ink-3 `#908B98`
- CEFR semantic scale A=green→B=amber→C=coral (replace current random brights, see design.md §6)

## Related Code Files

- Modify: `src/app/globals.css` — `:root`, `.dark`, `@theme inline` (add `--color-*` for new tokens)
- Modify: `src/app/[locale]/layout.tsx` — swap `next/font` imports to `Plus_Jakarta_Sans` + `Lora`
  (keep `JetBrains_Mono`); rename CSS vars or update `@theme` font mapping to match
- Read for values: `docs/Design/design.md` (§1 colors, §2 type, §3 radius, §4 shadows, §6 badges)

## Implementation Steps

1. In `layout.tsx`, replace `Inter`→`Plus_Jakarta_Sans` and `Literata`→`Lora`. Either keep the
   `--font-inter`/`--font-literata` var names (smallest diff) or rename to `--font-jakarta`/
   `--font-lora` and update `globals.css:11-13` `@theme` mapping to match. Pick one, be consistent.
2. Rewrite `:root` color values per design.md light palette. Keep every existing var name.
3. Add new vars: coral set, indigo-soft set, learning-status set, button-shadow values, `--rail`.
   Expose any consumed by Tailwind utilities through `@theme inline` as `--color-*`.
4. Update CEFR a1–c2 to the semantic green→amber→coral scale from design.md §6.
5. Update `.reading-content` (`globals.css:263`) to Lora 18px / 1.85 line-height / max 66ch per §2.
6. **Leave the `.dark` block untouched.** Dark mode is deferred (Phase 5); dark may look
   half-migrated until then, which is accepted. New light-only tokens may lack a dark counterpart
   for now — fine, as long as no existing name is removed/renamed (would break the live `.dark`).
7. `pnpm run typecheck && pnpm run lint`, then run the app in LIGHT mode and eyeball one page.

## Success Criteria

- [ ] App boots; no build/type/lint errors.
- [ ] Body/UI font renders as Plus Jakarta Sans; reading area renders as Lora.
- [ ] Primary buttons/links render indigo `#5A4FE0` with no component-file edits (token propagation
      proven).
- [ ] CEFR badges show the green→amber→coral semantic scale.
- [ ] Every token name present before the change still exists (grep parity) so `.dark` keeps
      resolving.
- [ ] `.dark` block left untouched (dark deferred to Phase 5).

## Risk Assessment

- **`design.md` still in flux** → values provisional; diff again before Phase 2. Mitigation: this
  phase is value-only and cheap to re-apply.
- **Renaming font vars breaks `@theme` mapping** → prefer keeping var names; if renaming, update
  both ends in the same commit.
- **A token consumed in code but missing from `@theme inline`** won't generate a utility class.
  Mitigation: grep for new token usage and confirm each has a `--color-*` entry.
