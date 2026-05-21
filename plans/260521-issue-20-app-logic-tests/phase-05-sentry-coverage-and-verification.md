# Phase 5: Sentry, Coverage, and Verification

## Goal

Close the issue by covering observability behavior and proving the app-logic coverage target.

## Target Files

- `src/lib/core/sentry.ts`
- `src/lib/core/logger.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `src/instrumentation.ts`
- `src/instrumentation-client.ts`
- `src/app/global-error.tsx`
- `src/app/api/sentry-example-api/route.ts`

## Work Items

1. Test `getSentryConfig` with and without DSN, including event filtering/scrubbing behavior in `beforeSend`.
2. Test `isSentryEnabled` under isolated module/env scenarios.
3. Test logger mock usage where app logic reports errors or important events.
4. Test Sentry example route throws the expected custom error and emits the expected logger call.
5. Add focused tests for instrumentation modules only where they can be imported safely with mocked Sentry.
6. Run coverage and identify app-logic modules below the enforced 80% line target from `vitest.config.ts`.
7. Add focused missing tests until `pnpm test:coverage` passes the configured threshold.

## Verification

- `pnpm test`
- `pnpm test -- --run`
- `pnpm test:coverage`

## Completion Gate

All tests must pass and `pnpm test:coverage` must pass the configured 80% line threshold for the app-logic modules covered by issue #20 before final review.
