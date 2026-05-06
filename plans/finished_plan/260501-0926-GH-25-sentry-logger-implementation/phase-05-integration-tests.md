---
title: "Phase 05: Integration Tests for Sentry Error Reporting"
issues: [ENG-32]
status: pending
priority: P3
effort: 1h
dependencies: [phase-02, phase-03, phase-04]
---

## Context Links

- Phase 01: [phase-01-sdk-config-foundation.md](phase-01-sdk-config-foundation.md)
- Phase 02: [phase-02-server-client-error-capture.md](phase-02-server-client-error-capture.md)
- Phase 03: [phase-03-pino-transport-performance.md](phase-03-pino-transport-performance.md)
- Config module: `src/lib/core/sentry.ts`
- Error boundary: `src/components/error-boundary.tsx`
- API routes: `src/app/api/*/route.ts`

## Overview

Write integration tests covering all Sentry integration points: config module, error boundaries, API route error handlers, Pino forwarding, and graceful degradation without DSN.

## Key Insights

- Tests must work with Sentry disabled (no DSN in CI) -- mock `Sentry.captureException` etc.
- No test runner configured yet in the project -- use Vitest (common for Next.js + Vercel stack)
- Server action tests need `@testing-library/react` or direct function invocation
- Error boundary tests use `@testing-library/react` + `jest-dom`
- Pino integration test verifies pinoIntegration config, not actual Sentry transport
- Keep tests focused on integration points, not Sentry SDK internals

## Requirements

### Functional
- Test error boundary renders fallback + reports to Sentry
- Test API route error handlers call `captureException` with context/tags
- Test Pino->Sentry config forwards error-level logs
- Test `sentry.ts` config module returns correct settings per environment
- Test graceful degradation when DSN not configured
- All tests pass with Sentry disabled

### Non-Functional
- No real Sentry network calls in tests
- Tests run in <30s total
- Mock Sentry SDK, not application code

## Architecture

### Test Structure
```
src/__tests__/sentry/
  ├── sentry-config.test.ts          -- config module unit tests
  ├── error-boundary.test.tsx        -- error boundary component tests
  ├── api-error-handler.test.ts      -- API route captureException tests
  └── pino-integration.test.ts       -- pinoIntegration config tests
```

### Mocking Strategy
```
@sentry/nextjs  -->  mock captureException, startSpan, withServerActionInstrumentation
process.env     -->  override NEXT_PUBLIC_SENTRY_DSN for config tests
pino            -->  no mock needed; test config logic only
```

## Related Code Files

### Create
- `src/__tests__/sentry/sentry-config.test.ts`
- `src/__tests__/sentry/error-boundary.test.tsx`
- `src/__tests__/sentry/api-error-handler.test.ts`
- `src/__tests__/sentry/pino-integration.test.ts`
- `vitest.config.ts` (if not existing)

### Read-only
- `src/lib/core/sentry.ts`
- `src/components/error-boundary.tsx`
- `src/app/api/upload/route.ts`
- `src/app/api/cards/review/route.ts`
- `sentry.server.config.ts`

## Implementation Steps

1. Set up Vitest if not configured:
   - Install: `npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom`
   - Create `vitest.config.ts` with Next.js path aliases
   - Add `"test": "vitest"` to package.json scripts

2. Create `src/__tests__/sentry/sentry-config.test.ts`:
   - `isSentryEnabled()` returns `false` when DSN empty
   - `isSentryEnabled()` returns `true` when DSN set
   - `getSentryConfig()` returns correct sample rates per NODE_ENV
   - `beforeSend` strips PII (email regex, file paths)

3. Create `src/__tests__/sentry/error-boundary.test.tsx`:
   - Renders children when no error
   - Renders fallback when child throws
   - Calls `Sentry.captureException` on error
   - Reset button clears error state
   - Uses `@testing-library/react` + `ErrorBoundary` component

4. Create `src/__tests__/sentry/api-error-handler.test.ts`:
   - Mock `Sentry.captureException`
   - Call API route handlers with invalid input that triggers catch blocks
   - Verify `captureException` called with correct tags `{ route, method }`
   - Verify original Pino log still fires
   - Verify NextResponse returns 500

5. Create `src/__tests__/sentry/pino-integration.test.ts`:
   - Verify `sentry.server.config.ts` includes `pinoIntegration()` in integrations
   - Verify `enableLogs: true` is set
   - Verify config has correct error levels `['error', 'fatal']`
   - Test does NOT verify actual Sentry transport (integration test only)

6. Run all tests: `npm test`

7. Verify tests pass with `NEXT_PUBLIC_SENTRY_DSN` unset

## Todo List

- [ ] Set up Vitest + testing dependencies
- [ ] Create `vitest.config.ts`
- [ ] Create `sentry-config.test.ts`
- [ ] Create `error-boundary.test.tsx`
- [ ] Create `api-error-handler.test.ts`
- [ ] Create `pino-integration.test.ts`
- [ ] Add `"test"` script to package.json
- [ ] Run `npm test` -- all pass

## Success Criteria

- All integration points have test coverage
- `npm test` passes with zero failures
- Tests work with Sentry disabled (no DSN required)
- No real network calls to Sentry
- Test suite runs in <30s
- Config module: 100% branch coverage
- Error boundary: render + capture tested
- API handlers: captureException with tags verified

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| No test runner configured yet | High | Medium | Vitest setup is Phase 05 step 1; well-documented for Next.js |
| API route tests need request mocking | Medium | Low | Use `NextRequest` constructor with test data |
| Error boundary tests flaky | Low | Medium | Use `@testing-library/react` proven patterns; avoid timer-based assertions |

## Next Steps

- All phases complete after this -- project has full Sentry integration with test coverage
- Update `docs/system-architecture.md` with Sentry integration details
