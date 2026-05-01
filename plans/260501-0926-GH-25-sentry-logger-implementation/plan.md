---
title: "Sentry Logger Implementation"
description: "Integrate Sentry SDK for error monitoring, performance tracking, and structured logging in the Next.js app"
status: in progress
priority: P1
effort: 6h
branch: catus2k4/eng-25-sentry-logger-implementation
tags: [sentry, monitoring, logging, error-tracking]
created: 2026-05-01
---

## Overview

Add Sentry as the error monitoring service for the English Reading Training App. Integrates with existing Pino logger, captures server/client errors, enables performance monitoring, and uploads source maps for production debugging.

## Key Decisions

- **Built-in `pinoIntegration()`** replaces custom Pino transport (available since @sentry/nextjs v10.18.0)
- **Next.js 15+ pattern**: `instrumentation-client.ts` + `instrumentation.ts` (not legacy `sentry.client.config.ts`)
- **Graceful disable**: No DSN = no Sentry init, zero runtime impact
- **Environment sample rates**: dev 100%, prod 10% traces; errors always 100%

## Phases

| # | Phase | Issues | Status | Files | Est |
|---|-------|--------|--------|-------|-----|
| 01 | SDK + Config foundation | ENG-25, ENG-26 | complete | [phase-01-sdk-config-foundation.md](phase-01-sdk-config-foundation.md) | 1.5h |
| 02 | Server + Client error capture | ENG-27, ENG-28 | complete | [phase-02-server-client-error-capture.md](phase-02-server-client-error-capture.md) | 1.5h |
| 03 | Pino integration + Performance | ENG-29, ENG-30 | complete | [phase-03-pino-transport-performance.md](phase-03-pino-transport-performance.md) | 1.5h |
| 04 | Source maps upload | ENG-31 | complete | [phase-04-source-maps-upload.md](phase-04-source-maps-upload.md) | 0.5h |
| 05 | Integration tests | ENG-32 | pending | [phase-05-integration-tests.md](phase-05-integration-tests.md) | 1h |

## Dependency Graph

```
Phase 01 ──> Phase 02 ──> Phase 03 ──> Phase 05
                                     Phase 04 ──> Phase 05
```

Phases 02, 03, 04 can partially overlap after Phase 01 completes.

## File Ownership Map

| Phase | Files Modified/Created |
|-------|----------------------|
| 01 | `package.json`, `next.config.ts`, `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `src/lib/core/sentry.ts`, `.env.example` |
| 02 | `src/app/api/upload/route.ts`, `src/app/api/upload/text/route.ts`, `src/app/api/study-session/route.ts`, `src/app/api/cards/review/route.ts`, `src/app/actions/analyze.ts`, `src/app/global-error.tsx`, `src/components/error-boundary.tsx`, `src/app/(dashboard)/error.tsx` |
| 03 | `instrumentation-client.ts` (add pinoIntegration), `src/app/api/upload/route.ts`, `src/app/actions/analyze.ts`, `sentry.server.config.ts` |
| 04 | `next.config.ts` (add widenClientFileUpload), `.github/workflows/*` |
| 05 | `src/__tests__/sentry-*.test.ts` |

## Rollback Plan

- Remove Sentry = delete config files, revert `next.config.ts`, uninstall package
- Env-var toggle: set `NEXT_PUBLIC_SENTRY_DSN` empty to disable
- No DB changes = no data migration concerns

## Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Build break from SDK | Low | High | Test `next build` in Phase 01 |
| Bundle size increase | Low | Medium | Sentry SDK tree-shakes; verify with bundle analyzer |
| Duplicate error reports | Medium | Low | pinoIntegration config filters error-level only |
| Source maps leak in dev | Low | Medium | Only upload in CI, not local builds |
