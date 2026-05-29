---
phase: 5
title: "CI Integration and Secret Gates"
status: completed
priority: P1
effort: "45m"
dependencies: [1, 2]
---

# Phase 5: CI Integration and Secret Gates

## Overview
Add Playwright E2E to GitHub Actions after existing checks, with clear gating when credentials or app environment are unavailable.

Implementation note: CI pins `ubuntu-24.04` instead of `ubuntu-latest` so Playwright Chromium installs on a supported runner.

## Requirements
- Functional: CI installs Chromium before running Playwright.
- Functional: CI runs E2E only when required secrets are present.
- Functional: missing secrets produce an explicit skip message.
- Functional: CI app env includes Supabase and database connection variables.
- Functional: database schema readiness is enforced or documented in the workflow.
- Non-functional: existing lint, typecheck, unit tests, and coverage remain unchanged.

## Architecture
The existing `test` job remains the main CI job. After coverage passes, CI evaluates whether all E2E secrets are present. If yes, it installs Chromium and runs Playwright. If no, it prints a skip message and exits successfully for the E2E section only.

The configured Supabase Postgres must already have the current Prisma schema, or the workflow should run `pnpm prisma migrate deploy` before E2E.

## Related Code Files
- Modify: `.github/workflows/ci.yml`
- Optional Modify: `package.json`

## Implementation Steps
1. Add a step that checks required E2E secrets and writes an output such as `should_run_e2e`.
2. Add environment variables for the E2E step from GitHub Secrets.
3. Add `pnpm exec playwright install --with-deps chromium`.
4. Add optional migration/schema readiness step if the CI database is intended to be managed by this workflow.
5. Run `pnpm e2e` when the gate passes.
6. Print a clear skip message when the gate fails.

## Success Criteria
- [x] CI still runs lint, typecheck, test, and coverage.
- [x] CI runs Playwright when all required secrets are present.
- [x] CI skips Playwright with a clear message when secrets are missing.
- [x] E2E does not fail with a confusing auth or database error when prerequisites are absent.

## Risk Assessment
The main risk is running E2E against a Supabase project whose database schema is stale. Handle this with either a migration step or an explicit documented precondition.
