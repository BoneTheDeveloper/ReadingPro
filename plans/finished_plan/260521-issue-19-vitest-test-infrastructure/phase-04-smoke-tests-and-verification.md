# Phase 4: Infrastructure Smoke Tests and Verification

Status: Completed on 2026-05-21.

## Goal

Add a few tiny tests that prove the infrastructure works, then run the project verification commands.

## Work Items

- Add smoke tests that verify:
  - `@/*` path aliases resolve.
  - jest-dom matchers are available in jsdom.
  - DB mocks reset between tests.
  - AI mocks can return deterministic generated content.
  - API helper can build a JSON `NextRequest`-compatible request.
- Run:
  - `pnpm test`
  - `pnpm test:coverage`
  - `pnpm lint`
  - `pnpm exec tsc --noEmit`
- Update plan status after implementation and verification.

## Acceptance Checks

- Completed: `pnpm test` passes.
- Completed: `pnpm test:coverage` produces v8 coverage output.
- Completed: `pnpm lint` and `pnpm exec tsc --noEmit` pass.
- Completed: smoke tests run with mocked provider, DB, Supabase, logger, Sentry, Next, and i18n boundaries.
