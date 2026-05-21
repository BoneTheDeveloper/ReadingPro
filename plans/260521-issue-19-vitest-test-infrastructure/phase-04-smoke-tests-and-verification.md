# Phase 4: Infrastructure Smoke Tests and Verification

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

- `pnpm test` passes.
- `pnpm test:coverage` produces coverage output.
- Lint and typecheck remain green.
- No real provider credentials or database connections are required for smoke tests.
