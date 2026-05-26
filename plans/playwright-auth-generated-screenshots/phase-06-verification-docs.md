---
phase: 6
title: "Verification and Documentation Cleanup"
status: pending
priority: P2
effort: "30m"
dependencies: [1, 2, 3, 4, 5]
---

# Phase 6: Verification and Documentation Cleanup

## Overview
Verify the full local workflow and document the exact setup expected from developers and CI maintainers.

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
- [ ] Auth setup creates `.auth/user.json`.
- [ ] Public E2E can run without credentials.
- [ ] Authenticated E2E reuses storage state.
- [ ] Screenshot output is written to `generated/screenshot/`.
- [ ] Documentation tells maintainers how the test user is provisioned outside Playwright.
- [ ] No generated screenshot, auth state, or report files are committed.

## Risk Assessment
The main risk is verification depending on credentials unavailable to the current developer. If credentials are missing, record which commands could not be run and why.
