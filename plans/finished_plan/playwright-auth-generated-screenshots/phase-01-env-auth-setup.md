---
phase: 1
title: "Environment and Auth Setup"
status: completed
priority: P1
effort: "45m"
dependencies: []
---

# Phase 1: Environment and Auth Setup

## Overview
Make Playwright load the right local environment files and make the shared login setup reliable. This phase should produce a reusable `.auth/user.json` for authenticated projects without creating users.

## Requirements
- Functional: local Playwright runs load `.env.local` and `.env.test`.
- Functional: CI uses injected environment variables without requiring checked-in env files.
- Functional: `e2e/auth.setup.ts` creates `.auth/` before writing `.auth/user.json`.
- Functional: missing auth credentials produce a clear error naming `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD`.
- Non-functional: do not introduce automatic user creation into normal Playwright runs.

## Architecture
Both Playwright configs should share the same environment-loading behavior. Local config startup loads app env first, then E2E credentials. CI leaves environment resolution to GitHub Actions secrets.

`e2e/auth.setup.ts` stays the only UI-login entry point. It navigates to `/en/sign-in`, signs in with the pre-created user, waits until the browser leaves the sign-in page, and persists browser storage state.

## Related Code Files
- Modify: `playwright.config.ts`
- Modify: `playwright.screenshot.config.ts`
- Modify: `e2e/auth.setup.ts`
- Optional Modify: `e2e/helpers/create-test-user.ts`

## Implementation Steps
1. Add local dotenv loading to Playwright config files, gated so CI relies on injected env.
2. Ensure `.auth/` exists before `storageState({ path: ".auth/user.json" })`.
3. Keep the login selectors aligned with the current sign-in form.
4. Improve missing-env errors so they do not mention only `.env.test` when running in CI.
5. Leave `e2e/helpers/create-test-user.ts` as a manual helper only, or update comments/scripts to make that explicit.

## Success Criteria
- [x] `pnpm e2e --project=setup` writes `.auth/user.json` locally when credentials are present.
- [x] Missing credentials fail with a clear, actionable message.
- [x] No Playwright command creates a Supabase user automatically.
- [x] CI can provide the same variables through secrets without needing `.env.test`.

## Risk Assessment
Main risk is hiding CI configuration mistakes behind local dotenv behavior. Keep error messages explicit and avoid fallback credentials.
