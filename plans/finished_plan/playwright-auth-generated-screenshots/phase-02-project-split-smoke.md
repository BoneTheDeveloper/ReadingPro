---
phase: 2
title: "Playwright Project Split and Smoke Tests"
status: completed
priority: P1
effort: "45m"
dependencies: [1]
---

# Phase 2: Playwright Project Split and Smoke Tests

## Overview
Split public and authenticated browser coverage so public smoke tests can run without credentials while protected pages reuse the auth state from setup.

## Requirements
- Functional: public smoke tests do not depend on `setup`.
- Functional: authenticated tests depend on `setup` and use `.auth/user.json`.
- Functional: add an authenticated smoke spec for `/en/study`.
- Non-functional: keep project names obvious for local and CI targeting.

## Architecture
Use separate Playwright projects:

- `setup`: runs only `e2e/auth.setup.ts`.
- `public`: runs unauthenticated smoke specs without `storageState`.
- `authenticated`: depends on `setup` and uses `storageState: ".auth/user.json"`.

The authenticated smoke test should verify it is not redirected to `/sign-in` and then assert on stable dashboard/study UI.

## Related Code Files
- Modify: `playwright.config.ts`
- Modify: `e2e/smoke.spec.ts`
- Create: `e2e/authenticated-smoke.spec.ts`

## Implementation Steps
1. Configure a public project that excludes setup and authenticated-only specs.
2. Configure an authenticated project that depends on setup and uses `.auth/user.json`.
3. Keep the existing homepage smoke test in the public project.
4. Add a protected-route smoke test for `/en/study`.
5. Use a stable locator from the rendered study/dashboard UI instead of only checking page title.

## Success Criteria
- [x] `pnpm e2e --project=public` runs without `.auth/user.json`.
- [x] `pnpm e2e --project=authenticated` runs setup first and reuses `.auth/user.json`.
- [x] `/en/study` smoke test fails clearly if redirected to `/en/sign-in`.
- [x] Public and authenticated tests can still run together through `pnpm e2e`.

## Risk Assessment
The main risk is accidental test matching that runs auth setup for public tests. Use explicit `testMatch` or `testIgnore` patterns per project.
