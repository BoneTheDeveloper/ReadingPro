---
phase: 5
title: "ESLint Enforcement"
status: completed
priority: P2
effort: "2h"
dependencies: [4]
---

# Phase 5: ESLint Enforcement

## Overview
Make the import-path convention self-enforcing via ESLint, update the existing server-boundary
rule for the renamed `contracts/` folder, and fix the 2 existing cross-boundary relative imports.

## Requirements
- Functional: lint fails on cross-boundary relative imports; existing server-boundary rule still
  fires under the new folder names; the 2 known violations are fixed.
- Non-functional: rule scoped to avoid false positives on legitimate intra-module `../`.

## Architecture
TDD = capture green baseline first (post-Phase-4 `pnpm lint`), add rule, expect it to flag the
2 known violations, fix them, return to green.

Existing rule in `eslint.config.mjs` already bans `@/server/**` imports from
`src/features/**/ui|hooks` and `src/shared/**`. After Phase 4, update glob `src/shared/**` ->
`src/contracts/**`.

New import-path enforcement (pragmatic — stock rules cannot express "relative only within
module" precisely): add `no-restricted-imports` patterns banning parent-relative imports that
escape into another top-level layer, e.g. group
`["../../app/*","../../server/*","../../contracts/*","../../features/*","../../ui/*","../../../**"]`
with message "Cross-layer imports must use the @/ alias, not relative paths." This catches the
real offenders (deep `../../../` escapes) without banning same-module `./`/`..`.

Known violations to fix (verified): 2 files importing `../../../tests/vitest/fixtures...`
from inside `src` — convert to a test-fixture alias or relocate the fixture import.

## Related Code Files
- Modify: `eslint.config.mjs` (update `src/shared/**` -> `src/contracts/**`; add import-path patterns)
- Modify: the 2 source files with `../../../tests/...` imports (locate via `rg -n "from ['\"]\.\./\.\./\.\./tests" src`)

## Implementation Steps
1. Post-Phase-4 baseline: `pnpm lint` green.
2. Update existing `no-restricted-imports` block glob `src/shared/**` -> `src/contracts/**`.
3. Add cross-layer relative-import ban patterns (see Architecture).
4. Run `pnpm lint`; expect the 2 `../../../tests` violations to surface.
5. Fix the 2 violations (alias or proper test-fixture import path).
6. `pnpm lint` green; `pnpm typecheck && pnpm test` still green.

## Success Criteria
- [ ] `eslint.config.mjs` references `src/contracts/**` (not `src/shared/**`)
- [ ] Cross-layer relative imports are flagged by lint
- [ ] The 2 `../../../tests` violations fixed; `pnpm lint` green
- [ ] `pnpm typecheck && pnpm test` green
- [ ] A deliberately added cross-layer `../` import fails lint (spot-check, then revert)

## Risk Assessment
Low-medium. Risk = false positives banning legitimate intra-module `../`. Mitigation: target
only deep/cross-layer parent patterns; spot-check against current relative imports before
finalizing. Must run after Phase 4 (depends on renamed folders).
