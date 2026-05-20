---
phase: 5
title: "Validation"
status: complete
priority: P1
effort: "1h"
dependencies: [1, 2, 3, 4]
---

# Phase 5: Validation

## Overview

Verify routing, auth, dark mode, accessibility, and localized copy before shipping.

## Requirements

- Functional: all major flows work in light/dark and English/Vietnamese.
- Non-functional: no type errors, no broken routes, no obvious layout overflow.

## Architecture

Use layered validation:

- Static: TypeScript and ESLint.
- Runtime: route smoke tests.
- UX: desktop/mobile screenshots in light and dark.
- Auth: logged-out and logged-in route behavior.

## Related Code Files

- Modify if needed: `docs/testing/manual-test-checklist.md`
- Modify if needed: `docs/Design/styling-guide.md`

## Implementation Steps

1. Run `pnpm tsc --noEmit`.
2. Run `pnpm lint`.
3. Run `pnpm build` if environment variables are available.
4. Smoke test:
   - `/en`
   - `/vi`
   - `/en/sign-in`
   - `/vi/sign-in`
   - `/en/study`
   - `/vi/study`
   - `/en/progress`
   - `/vi/progress`
5. Test unauthenticated protected route redirect and authenticated sign-out.
6. Check theme persistence after reload and system preference behavior.
7. Check mobile widths for Vietnamese labels.

## Success Criteria

- [x] Type check passes.
- [x] Lint passes.
- [x] Build passes or known env-only blockers are documented.
- [x] Locale routes and auth redirects work.
- [x] Theme toggle works without flash or hydration warnings.
- [x] Visual QA passes for dashboard, study, reading, test, auth.

## Risk Assessment

Risk: build may fail if required environment variables are missing.
Mitigation: document env blocker and still complete type/lint plus local route checks.
