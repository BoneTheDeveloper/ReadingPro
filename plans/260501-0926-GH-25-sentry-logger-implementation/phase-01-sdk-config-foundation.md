---
title: "Phase 01: SDK + Config Foundation"
issues: [ENG-25, ENG-26]
status: complete
priority: P1
effort: 1.5h
dependencies: []
---

## Context Links

- Sentry Next.js Manual Setup: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
- Existing logger: `src/lib/core/logger.ts`
- Next config: `next.config.ts`
- Package: `package.json`

## Overview

Install `@sentry/nextjs`, create SDK config files using Next.js 15+ conventions, add environment-based configuration module, update `next.config.ts` with `withSentryConfig`.

## Key Insights

- Next.js 15+ uses `instrumentation-client.ts` for client init (not `sentry.client.config.ts`)
- `instrumentation.ts` registers server/edge configs and exports `onRequestError`
- `withSentryConfig` wraps next.config.ts for source maps + webpack integration
- Sentry must gracefully disable when DSN absent (dev without Sentry account)
- `pinoIntegration()` exists natively -- no custom transport needed (configured in Phase 03)

## Requirements

### Functional
- Install `@sentry/nextjs` package
- Create client config (`instrumentation-client.ts`)
- Create server config (`sentry.server.config.ts`)
- Create edge config (`sentry.edge.config.ts`)
- Create instrumentation entry (`instrumentation.ts`)
- Create typed config module (`src/lib/core/sentry.ts`)
- Update `next.config.ts` with `withSentryConfig`
- Add env vars to `.env.example`

### Non-Functional
- Zero runtime impact when DSN not configured
- Build passes with Sentry disabled
- Dev server starts without errors
- TypeScript strict mode compliant

## Architecture

```
instrumentation-client.ts  -->  Sentry.init() (browser)
instrumentation.ts         -->  register() imports server/edge configs
                             -->  onRequestError = Sentry.captureRequestError
sentry.server.config.ts    -->  Sentry.init() (Node.js)
sentry.edge.config.ts      -->  Sentry.init() (Edge runtime)
src/lib/core/sentry.ts     -->  getSentryConfig(), isSentryEnabled()
next.config.ts             -->  withSentryConfig(nextConfig, {...})
```

Data flow:
1. App boots -> `instrumentation.ts` `register()` loads runtime-specific config
2. Each config calls `Sentry.init()` with shared settings from `sentry.ts`
3. `onRequestError` auto-captures unhandled server errors
4. Client init auto-captures unhandled browser errors

## Related Code Files

### Modify
- `package.json` -- add `@sentry/nextjs` dependency
- `next.config.ts` -- wrap with `withSentryConfig`
- `.env.example` -- add Sentry env vars

### Create
- `instrumentation-client.ts` -- client-side Sentry init
- `instrumentation.ts` -- register server/edge + export `onRequestError`
- `sentry.server.config.ts` -- server-side Sentry init
- `sentry.edge.config.ts` -- edge runtime Sentry init
- `src/lib/core/sentry.ts` -- shared config module

### No changes
- `src/lib/core/logger.ts` -- untouched in this phase

## Implementation Steps

1. Install package: `npm install @sentry/nextjs`
2. Create `src/lib/core/sentry.ts` with:
   - `getSentryConfig()` returning `{ dsn, environment, tracesSampleRate, replaysSessionSampleRate, replaysOnErrorSampleRate, beforeSend }`
   - `isSentryEnabled()` checking `NEXT_PUBLIC_SENTRY_DSN` presence
   - `beforeSend` hook stripping PII (email addresses, file paths)
   - Sample rates: dev traces=1.0, prod traces=0.1; replays always error=1.0, session=0.1
3. Create `instrumentation-client.ts`:
   - Import `sentry.ts` config
   - `Sentry.init()` with `sendDefaultPii: false`
   - Export `onRouterTransitionStart = Sentry.captureRouterTransitionStart`
4. Create `sentry.server.config.ts`:
   - Import `sentry.ts` config
   - `Sentry.init()` with server-specific settings
5. Create `sentry.edge.config.ts`:
   - Minimal config for edge runtime
6. Create `instrumentation.ts`:
   - `register()` dynamically imports server/edge configs based on `NEXT_RUNTIME`
   - Export `onRequestError = Sentry.captureRequestError`
7. Update `next.config.ts`:
   - Import `withSentryConfig`
   - Wrap existing config with `withSentryConfig(nextConfig, { org, project, silent: !process.env.CI })`
8. Update `.env.example` with:
   - `NEXT_PUBLIC_SENTRY_DSN=`
   - `SENTRY_AUTH_TOKEN=`
   - `SENTRY_ORG=`
   - `SENTRY_PROJECT=`
9. Run `npm run build` to verify no errors

## Todo List

- [ ] Install `@sentry/nextjs`
- [ ] Create `src/lib/core/sentry.ts`
- [ ] Create `instrumentation-client.ts`
- [ ] Create `sentry.server.config.ts`
- [ ] Create `sentry.edge.config.ts`
- [ ] Create `instrumentation.ts`
- [ ] Update `next.config.ts`
- [ ] Update `.env.example`
- [ ] Verify `npm run build` passes
- [ ] Verify `npm run dev` starts without errors

## Success Criteria

- `npm run build` completes with zero errors
- `npm run dev` starts and app loads normally
- `isSentryEnabled()` returns false when no DSN set
- TypeScript compiles without errors
- No Sentry network requests when DSN empty

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SDK incompatible with Next 16.2 | Low | High | Verify compatibility; Next 15+ supported per docs |
| Build fails with `withSentryConfig` | Medium | High | Test immediately; fallback to manual webpack config |
| `instrumentation.ts` conflicts | Low | Medium | File does not exist yet in project |

## Security Considerations

- `SENTRY_AUTH_TOKEN` must never be committed (already in .gitignore pattern)
- `NEXT_PUBLIC_SENTRY_DSN` is safe to expose (public by design)
- `beforeSend` hook strips PII before sending to Sentry
- `sendDefaultPii: false` by default (opt-in, not opt-out)

## Next Steps

- Phase 02 requires this phase complete (needs `Sentry.captureException` available)
- Phase 03 needs server config ready for `pinoIntegration()`
