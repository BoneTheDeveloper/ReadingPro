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
6. Run coverage and identify core modules below the 80% line target.
7. Add focused missing tests until the target is met or document any justified exclusions.

## Verification

- `pnpm test`
- `pnpm test:coverage`
- `pnpm lint`
- `pnpm exec tsc --noEmit`

## Completion Gate

All tests must pass and coverage output must show 80%+ line coverage for the core modules covered by issue #20 before final review.

