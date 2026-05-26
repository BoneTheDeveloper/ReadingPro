---
title: "Playwright Authenticated E2E & Generated Screenshots"
description: "Standardize Playwright auth with one pre-created test user for local and CI, then reuse storage state for authenticated tests and generated screenshots."
status: pending
priority: P2
effort: 3h
tags: ["testing", "playwright", "e2e", "auth", "ci", "screenshots"]
created: "2026-05-26"
createdBy: "codex"
---

# Playwright Authenticated E2E & Generated Screenshots

## Summary

Standardize Playwright so local and CI both sign in with one pre-created test user. Local reads the user from `.env.test`; CI reads the same variables from GitHub Secrets. The setup project logs in once, saves `.auth/user.json`, and every authenticated spec or screenshot flow reuses that storage state.

Generated screenshots should be written under `generated/screenshot/`. The whole `generated/` directory is ignored by git.

This plan does not create users automatically, seed database records, or introduce local Supabase in CI.

## Phases

| Phase | Name | Status | Focus |
|-------|------|--------|-------|
| 1 | [Environment and auth setup](./phase-01-env-auth-setup.md) | Pending | Local env loading, clear auth errors, `.auth/user.json` creation |
| 2 | [Playwright project split and smoke tests](./phase-02-project-split-smoke.md) | Pending | Public/authenticated project separation and `/en/study` smoke coverage |
| 3 | [Screenshot auth flow and command interface](./phase-03-screenshot-flow.md) | Pending | Authenticated screenshots, generated output defaults, `PAGE=` Make interface |
| 4 | [Docker and generated-output hygiene](./phase-04-docker-generated-output.md) | Pending | Host-mounted generated screenshots and ignore rules |
| 5 | [CI integration and secret gates](./phase-05-ci-integration.md) | Pending | GitHub Actions E2E, Chromium install, missing-secret skip, DB readiness |
| 6 | [Verification and documentation cleanup](./phase-06-verification-docs.md) | Pending | Local verification commands and setup documentation |

## Login Mechanism

### Local

- The app continues to read app/Supabase settings from `.env.local`.
- Playwright reads test credentials from `.env.test`:
  - `E2E_TEST_USER_EMAIL`
  - `E2E_TEST_USER_PASSWORD`
- `e2e/auth.setup.ts` opens `/en/sign-in`, fills the email/password fields, submits the form, waits until the browser leaves the sign-in page, and writes `.auth/user.json`.
- Authenticated tests use `storageState: ".auth/user.json"` and do not fill the login form again.
- Public tests do not depend on the setup project or `.auth/user.json`.

### CI

- GitHub Secrets provide the same test user credentials and the app environment:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `E2E_TEST_USER_EMAIL`
  - `E2E_TEST_USER_PASSWORD`
- The CI app points at the Supabase project configured by those secrets.
- The configured Supabase Postgres schema must already be migrated, or the CI job must run a migration step before Playwright.
- Playwright runs the same `auth.setup.ts` login flow and creates `.auth/user.json` temporarily inside the GitHub runner.
- `SUPABASE_SERVICE_ROLE_KEY` is not required for the E2E login path because the user already exists.

## Implementation Changes

- Update Playwright configuration so local runs load `.env.local` and `.env.test`, while CI relies on injected environment variables.
- Keep `E2E_BASE_URL` support for Docker or externally started servers.
- Ensure the `.auth/` directory exists before `auth.setup.ts` writes `user.json`.
- Keep `auth.setup.ts` as the only place that performs UI login.
- Split Playwright projects so public tests run without auth and authenticated tests depend on setup.
- Add one authenticated smoke spec that opens `/en/study`, confirms it is not redirected to `/sign-in`, and verifies the study/dashboard UI renders.
- Update the screenshot config to depend on auth setup and use `.auth/user.json`.
- Simplify `e2e/screenshot-authenticated.ts` so it only opens `SCREENSHOT_PATH`, waits for a deterministic page readiness signal, and writes `SCREENSHOT_DIR/SCREENSHOT_NAME.png`.
- Preserve screenshot defaults:
  - `SCREENSHOT_PATH=/en/study`
  - `SCREENSHOT_NAME=study-screenshot`
  - `SCREENSHOT_DIR=generated/screenshot`
- Add an E2E step/job to the existing GitHub Actions workflow after lint, typecheck, and Vitest.
- Gate the CI E2E execution so missing secrets produce a clear skip message instead of a confusing authentication failure.
- Install Chromium in CI with `pnpm exec playwright install --with-deps chromium` before running Playwright.

## Screenshot Config & Commands

- `playwright.screenshot.config.ts` should remain a dedicated config for screenshots, but mirror the auth shape of `playwright.config.ts`:
  - `testMatch: /screenshot-authenticated\.ts/`
  - setup project runs `e2e/auth.setup.ts`
  - screenshot project depends on setup
  - screenshot project uses `storageState: ".auth/user.json"`
  - `webServer` uses the same `E2E_BASE_URL` behavior as normal E2E
- `e2e/screenshot-authenticated.ts` should not call the sign-in page directly. It should:
  - read `SCREENSHOT_PATH`, default `/en/study`
  - read `SCREENSHOT_NAME`, default `study-screenshot`
  - read `SCREENSHOT_DIR`, default `generated/screenshot`
  - create the screenshot directory when missing
  - navigate to the target path using authenticated storage state
  - assert it is not on `/sign-in`
  - wait for a stable page landmark or route-specific selector instead of relying only on `networkidle`
  - write a full-page PNG to `${SCREENSHOT_DIR}/${SCREENSHOT_NAME}.png`
- Keep `make screenshot` as the primary user-facing command:
  - `make screenshot` captures `/en/study` to `generated/screenshot/study-screenshot.png`
  - `make screenshot PAGE=/en/progress NAME=progress` captures `generated/screenshot/progress.png`
  - `make screenshot PAGE=/en/study NAME=study` captures `generated/screenshot/study.png`
- Add a package script for users who do not want Make:
  - `pnpm e2e:screenshot`
  - internally runs `playwright test --config=playwright.screenshot.config.ts`
- The Make target should mount `generated/screenshot` into the Docker container so generated screenshots appear on the host machine.
- `generated/` stays gitignored and is treated as generated local output, not a committed artifact.

## Test Plan

- Local:
  - `pnpm e2e --project=setup` creates `.auth/user.json`.
  - `pnpm e2e` runs both public smoke tests and authenticated smoke tests.
  - `pnpm e2e --project=public` runs without `.auth/user.json`.
  - `pnpm e2e --project=authenticated` creates and reuses `.auth/user.json`.
  - `make screenshot PAGE=/en/study NAME=study-screenshot` creates `generated/screenshot/study-screenshot.png`.
  - `pnpm e2e:screenshot` creates the same default screenshot without using Make.

- CI:
  - Existing lint, typecheck, unit tests, and coverage continue to run.
  - When all required secrets are present, the E2E step logs in with the existing test user and runs authenticated Playwright tests.
  - When required secrets are missing, the workflow logs that E2E was skipped and does not fail only because credentials are unavailable.

## Acceptance Criteria

- Tests after login reuse `.auth/user.json` and do not duplicate login steps.
- Screenshot flow reuses the same authenticated storage state as normal E2E tests.
- Screenshots are generated under `generated/screenshot/`.
- `generated/` is ignored by git.
- Local and CI use the same login mechanism with different env sources.
- The test user is never created by the Playwright run.
- Missing credentials fail or skip with an explicit message naming the missing E2E/app env requirement.
- Public E2E tests can run without auth credentials.
- Authenticated E2E tests do not run against an unmigrated database without a clear error or preflight gate.

## Assumptions

- The test user already exists in the Supabase project used for local and CI.
- The matching user profile/database rows can be created by app login code, but the database schema itself already exists.
- `.env.test` exists locally and contains `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD`.
- GitHub Secrets contain equivalent credentials for the CI Supabase project.
- This plan only covers Playwright auth infrastructure, one authenticated smoke test, and screenshots into `generated/screenshot`; full upload, study, progress, and flashcard E2E flows remain out of scope.
