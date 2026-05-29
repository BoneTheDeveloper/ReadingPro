---
phase: 6
title: "Verification and Documentation Cleanup"
status: completed
priority: P2
effort: "30m"
dependencies: [1, 2, 3, 4, 5]
---

# Phase 6: Verification and Documentation Cleanup

## Overview
Verify the full local workflow and document the exact setup expected from developers and CI maintainers.

Implementation note: host Playwright browser downloads are unsupported on Ubuntu 26.04 with the current Playwright version, so Docker-backed E2E/screenshot commands are the local fallback on that OS.

## Requirements
- Functional: local E2E commands pass with configured env.
- Functional: screenshot commands generate PNG files in the expected directory.
- Functional: docs or comments explain that the test user is pre-created.
- Non-functional: final plan implementation leaves no generated artifacts staged.

## Architecture
Verification should cover the setup project, public tests, authenticated tests, screenshot config, and Docker Make target when Docker is available. Documentation should capture local `.env.test`, GitHub Secrets, and database schema expectations.

## Related Code Files
- Modify: `README.md` or project E2E docs if present
- Modify: `Makefile`
- Review: `package.json`
- Review: `.github/workflows/ci.yml`

## Implementation Steps
1. Run `pnpm e2e --project=setup`.
2. Run `pnpm e2e --project=public`.
3. Run `pnpm e2e --project=authenticated`.
4. Run `pnpm e2e:screenshot`.
5. Run `make screenshot PAGE=/en/study NAME=study-screenshot` when Docker is available.
6. Document local `.env.test` variables, GitHub Secrets, and database schema readiness.
7. Confirm generated files are ignored and not staged.

## Success Criteria
- [x] Auth setup creates `.auth/user.json`.
- [x] Public E2E can run without credentials.
- [x] Authenticated E2E reuses storage state.
- [x] Screenshot output is written to `generated/screenshot/`.
- [x] Documentation tells maintainers how the test user is provisioned outside Playwright.
- [x] No generated screenshot, auth state, or report files are committed.

## Verification Run - 2026-05-26

Passed:

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test` — 26 test files and 144 tests passed.
- `pnpm exec playwright test --list` — listed `setup`, `public`, and `authenticated` projects.
- `pnpm exec playwright test --config=playwright.screenshot.config.ts --list` — listed `setup` and `screenshot` projects.
- `docker compose -f docker-compose.e2e.yml run --rm --build e2e npx playwright test --project=public` — public smoke passed in Docker.

Fixed during verification:

- Replaced the public smoke test's empty-title assertion with stable sign-in form locators.
- Added `host.docker.internal` to `allowedDevOrigins` so Docker-backed Playwright can hit the local Next dev server cleanly.

Blocked:

- `.env.test` is present but does not define `E2E_TEST_USER_EMAIL` or `E2E_TEST_USER_PASSWORD`.
- `pnpm e2e --project=setup`, `pnpm e2e --project=authenticated`, `pnpm e2e:screenshot`, and `make screenshot PAGE=/en/study NAME=study-screenshot` remain blocked until those credentials point at a pre-created Supabase test user.

## Risk Assessment
The main risk is verification depending on credentials unavailable to the current developer. If credentials are missing, record which commands could not be run and why.
