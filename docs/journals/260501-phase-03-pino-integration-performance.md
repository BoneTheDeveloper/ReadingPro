---
date: 2026-05-01
tags: [sentry, pino, performance-monitoring, phase-03]
---

## Phase 03: Pino Integration + Performance Monitoring

### What happened
- Added `Sentry.pinoIntegration()` to `sentry.server.config.ts` to forward Pino `error`/`fatal` logs as Sentry error events and `warn`/`error`/`fatal` as structured logs
- Wrapped expensive operations with `Sentry.startSpan()` across 5 files:
  - `upload/route.ts`: `pdf-parse`, `file-write`
  - `actions/analyze.ts`: `ai:cefr-detect`, `ai:content-simplify`, `ai:question-gen`, `db:passage-create`, `db:user-lookup` (both `analyzeContentAction` and `studyAnalyzeAction`)
  - `cards/review/route.ts`: `db:card-review-update`
  - `study-session/route.ts`: `db:session-create`, `db:session-update`
- Removed redundant `Sentry.captureException()` calls in catch blocks where fallbacks are working as designed (CEFR heuristic, original content passthrough)
- Build passes clean

### Key decisions
- Skipped `sentry.edge.config.ts` — Pino uses `pino-pretty` transport (Node.js only), not available in edge runtime
- `enableLogs: true` already set in shared config (`src/lib/core/sentry.ts`), no duplication needed
- `pinoIntegration` is available via `@sentry/nextjs` (re-exported from `@sentry/node`), no separate `@sentry/node` import needed
- Removed `captureException` for gracefully-degraded AI errors — these are expected behaviors with fallbacks, not true exceptions

### Code review findings
- No critical issues
- Medium: duplicate error events from `captureException` + `pinoIntegration` for same catch blocks → fixed by removing redundant `captureException`
- Medium: user DB lookups unwrapped → added `db:user-lookup` span
- H1: commit scope mixed with error boundary changes (out of scope for this phase) — noted for git history

### Progress
- Sentry integration: 3/5 phases complete (60%)
- Remaining: Phase 04 (Source Maps), Phase 05 (Integration Tests)
