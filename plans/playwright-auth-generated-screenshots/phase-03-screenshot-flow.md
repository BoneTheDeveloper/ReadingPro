---
phase: 3
title: "Screenshot Auth Flow and Command Interface"
status: pending
priority: P1
effort: "45m"
dependencies: [1, 2]
---

# Phase 3: Screenshot Auth Flow and Command Interface

## Overview
Make generated screenshots use the same authenticated storage state as E2E tests. The screenshot spec should only navigate to the target page and capture output.

## Requirements
- Functional: screenshot config has a setup project and a screenshot project.
- Functional: screenshot project depends on setup and uses `.auth/user.json`.
- Functional: screenshot spec does not submit the sign-in form.
- Functional: default output is `generated/screenshot/study-screenshot.png`.
- Functional: Make uses `PAGE=` for route selection instead of `PATH=`.
- Non-functional: screenshot waits should be deterministic and not rely only on `networkidle`.

## Architecture
`playwright.screenshot.config.ts` mirrors the authenticated portion of the main Playwright config while keeping a dedicated `testMatch` for `e2e/screenshot-authenticated.ts`.

The screenshot test reads `SCREENSHOT_PATH`, `SCREENSHOT_NAME`, and `SCREENSHOT_DIR`, creates the output directory, navigates with authenticated storage state, asserts it is not on `/sign-in`, waits for a stable visible landmark, and writes a full-page PNG.

## Related Code Files
- Modify: `playwright.screenshot.config.ts`
- Modify: `e2e/screenshot-authenticated.ts`
- Modify: `Makefile`
- Modify: `package.json`

## Implementation Steps
1. Add setup and screenshot projects to `playwright.screenshot.config.ts`.
2. Set screenshot project `storageState` to `.auth/user.json`.
3. Remove direct login from `e2e/screenshot-authenticated.ts`.
4. Default `SCREENSHOT_PATH=/en/study`, `SCREENSHOT_NAME=study-screenshot`, and `SCREENSHOT_DIR=generated/screenshot`.
5. Create the screenshot directory before writing the PNG.
6. Update Make to map `PAGE` into `SCREENSHOT_PATH`.
7. Add `pnpm e2e:screenshot` as a package script.

## Success Criteria
- [ ] `pnpm e2e:screenshot` creates `generated/screenshot/study-screenshot.png`.
- [ ] `make screenshot PAGE=/en/study NAME=study` creates `generated/screenshot/study.png`.
- [ ] Screenshot spec contains no duplicated sign-in form steps.
- [ ] Screenshot flow fails clearly if auth redirects back to sign-in.

## Risk Assessment
The main risk is flaky screenshot timing. Prefer waiting for a visible landmark or route-specific stable selector over `networkidle`.
