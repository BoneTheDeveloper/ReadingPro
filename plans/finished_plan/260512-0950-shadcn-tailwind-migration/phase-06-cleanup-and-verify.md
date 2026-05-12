---
phase: 6
title: "Cleanup and verify"
status: pending
priority: P2
effort: "1h"
dependencies: [5]
---

# Phase 6: Cleanup and verify

## Overview

Final verification pass: scan entire codebase for remaining shadcn violations, run build/type checks, verify no regressions, update plan status.

## Requirements

- Zero hardcoded hex colors in JSX files
- Zero Tailwind v3 color syntax (`bg-primary-600`, `bg-neutral-*`)
- Zero raw `<button>` where shadcn Button could be used (except error-boundary)
- Zero raw `<input>` where shadcn Input could be used
- Zero inline SVGs where Lucide equivalent exists
- Build and type-check pass

## Architecture

Verification-only phase — no new code. Uses grep/scans to find any remaining violations.

## Related Code Files

- Read: All `.tsx` files in `src/components/` and `src/app/`
- Read: `docs/code-standards.md` — verify rules are complete
- Read: `CLAUDE.md` — verify conventions are complete

## Implementation Steps

1. **Scan for hardcoded hex colors**:
   ```bash
   grep -rn 'style={{.*#[0-9a-fA-F]' src/ --include='*.tsx'
   grep -rn 'color:.*#' src/ --include='*.tsx'
   ```
   Expect: zero results (except dynamic calculated values)

2. **Scan for Tailwind v3 color syntax**:
   ```bash
   grep -rn 'bg-primary-[0-9]' src/ --include='*.tsx'
   grep -rn 'bg-neutral-[0-9]' src/ --include='*.tsx'
   grep -rn 'text-primary-[0-9]' src/ --include='*.tsx'
   grep -rn 'text-neutral-[0-9]' src/ --include='*.tsx'
   ```
   Expect: zero results

3. **Scan for raw `<button>` elements**:
   ```bash
   grep -rn '<button' src/ --include='*.tsx' | grep -v 'Button'
   ```
   Expect: only `error-boundary.tsx`

4. **Scan for raw `<input>` elements**:
   ```bash
   grep -rn '<input' src/ --include='*.tsx' | grep -v 'Input'
   ```
   Expect: zero results (or only hidden inputs for file upload)

5. **Scan for inline SVGs**:
   ```bash
   grep -rn '<svg' src/ --include='*.tsx'
   ```
   Expect: zero results (or only in `upload-zone.tsx` if dropzone requires it)

6. **Scan for onMouseEnter/onMouseLeave**:
   ```bash
   grep -rn 'onMouseEnter\|onMouseLeave' src/ --include='*.tsx'
   ```
   Expect: zero results

7. **Run build**: `npm run build` — must pass with zero errors
8. **Run type check**: `npx tsc --noEmit` — must pass
9. **Run lint**: `npm run lint` — must pass

10. **Fix any violations found** — if scans discover missed violations, fix them

11. **Update plan status** — mark all phases as completed

## Success Criteria

- [ ] Zero hardcoded hex colors in JSX (verified by grep)
- [ ] Zero Tailwind v3 color syntax (verified by grep)
- [ ] Zero raw `<button>` except error-boundary.tsx (verified by grep)
- [ ] Zero raw `<input>` except hidden file inputs (verified by grep)
- [ ] Zero inline SVGs except upload-zone.tsx (verified by grep)
- [ ] Zero `onMouseEnter`/`onMouseLeave` handlers (verified by grep)
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] All phase files marked as completed

## Risk Assessment

Very low risk — verification only. Only risk: finding missed violations that require additional fixes. Mitigate: budget 30min buffer for any fixes needed.
