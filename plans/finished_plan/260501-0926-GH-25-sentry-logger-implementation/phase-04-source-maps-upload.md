---
title: "Phase 04: Source Maps Upload for Production Debugging"
issues: [ENG-31]
status: completed
priority: P2
effort: 0.5h
dependencies: [phase-01]
---

## Context Links

- Phase 01: [phase-01-sdk-config-foundation.md](phase-01-sdk-config-foundation.md)
- Sentry source maps: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
- Next config: `next.config.ts`

## Overview

Configure Sentry source maps upload so production errors show original TypeScript source locations instead of minified/bundled code. Uses `withSentryConfig` options already added in Phase 01.

## Key Insights

- `withSentryConfig` in `next.config.ts` handles source map upload automatically during `next build`
- Only needs `authToken`, `org`, `project` + `widenClientFileUpload: true`
- Source maps upload only in CI (controlled by `silent: !process.env.CI`)
- `SENTRY_AUTH_TOKEN` must be set in CI environment, never committed
- Source maps should NOT be available to users (Next.js strips them from client by default)

## Requirements

### Functional
- Configure `withSentryConfig` options for source map upload
- Add `widenClientFileUpload: true` for broader coverage
- Ensure `SENTRY_AUTH_TOKEN` is set in CI only
- Verify production errors show original TS filenames + line numbers

### Non-Functional
- No source map leak to end users
- Build time increase < 30s (acceptable for CI)
- Local `next build` works without auth token (graceful skip)

## Architecture

```
CI: next build
  -> withSentryConfig wraps build
  -> Reads SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT
  -> Builds + uploads source maps to Sentry
  -> Production errors -> Sentry matches stack trace to source maps -> shows original code
```

## Related Code Files

### Modify
- `next.config.ts` -- add `widenClientFileUpload`, `authToken` to withSentryConfig options

### No changes
- No CI workflows exist yet in this repo -- document setup instructions only

## Implementation Steps

1. Update `next.config.ts` withSentryConfig options:
   ```
   withSentryConfig(nextConfig, {
     org: process.env.SENTRY_ORG,
     project: process.env.SENTRY_PROJECT,
     authToken: process.env.SENTRY_AUTH_TOKEN,
     silent: !process.env.CI,
     widenClientFileUpload: true,
   })
   ```

2. Verify local build works without `SENTRY_AUTH_TOKEN`:
   - Run `npm run build` -- should complete with warning (silent: true) but no error

3. Document CI setup requirements (in comments or .env.example):
   - Set `SENTRY_AUTH_TOKEN` as CI secret
   - Set `SENTRY_ORG` and `SENTRY_PROJECT` as CI env vars
   - Ensure `CI=true` during build

4. Verify source maps not exposed to users:
   - Check `.next/static/` does not contain `.map` files accessible via HTTP

## Todo List

- [x] Update `next.config.ts` with source map upload config
- [x] Verify local build without auth token
- [x] Update `.env.example` with CI instructions
- [x] Verify no source map leak

## Success Criteria

- `npm run build` passes without `SENTRY_AUTH_TOKEN` (graceful skip)
- `withSentryConfig` configured with `widenClientFileUpload: true`
- `.env.example` documents all required Sentry env vars
- No `.map` files served to end users

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Build fails without auth token | Low | High | `silent: !process.env.CI` suppresses errors locally |
| Source maps leak to users | Very Low | High | Next.js strips source maps by default; verify in Phase 05 |
| Build time increase significant | Low | Low | `widenClientFileUpload` adds ~10-30s; acceptable for CI |

## Security Considerations

- `SENTRY_AUTH_TOKEN` is a secret -- must be CI env var only, never committed
- Source maps contain original code -- Sentry stores securely, not served to users
- `SENTRY_ORG` and `SENTRY_PROJECT` are non-sensitive but should be set correctly

## Next Steps

- Phase 05 tests source map resolution in production-like build
