---
title: "Phase 03: Pino Integration + Performance Monitoring"
issues: [ENG-29, ENG-30]
status: complete
priority: P2
effort: 1.5h
dependencies: [phase-01, phase-02]
---

## Context Links

- Phase 01: [phase-01-sdk-config-foundation.md](phase-01-sdk-config-foundation.md)
- Phase 02: [phase-02-server-client-error-capture.md](phase-02-server-client-error-capture.md)
- Sentry Pino integration: https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/integrations/pino/
- Existing logger: `src/lib/core/logger.ts`
- Sentry tracing docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/tracing/

## Overview

Enable Sentry's built-in `pinoIntegration()` to forward Pino logs to Sentry. Add performance monitoring with custom spans around expensive operations (PDF parse, AI calls, DB queries).

## Key Insights

- **No custom transport needed** -- `@sentry/nextjs` v10.18.0+ has built-in `pinoIntegration()`
- Configured in `Sentry.init()` integrations array, not as a Pino transport
- `pinoIntegration({ error: { levels: ['error', 'fatal'] } })` forwards only error/fatal to Sentry as error events
- `enableLogs: true` + `pinoIntegration({ log: { levels: ['warn', 'error'] } })` sends structured logs to Sentry Logs
- Traces are already configured via `tracesSampleRate` in Phase 01
- `Sentry.startSpan()` wraps expensive ops for custom spans
- Next.js auto-instruments API routes and page loads

## Requirements

### Functional (ENG-29)
- Add `pinoIntegration()` to server-side Sentry init
- Configure to forward `error`/`fatal` Pino logs as Sentry error events
- Optionally forward `warn`+ as Sentry structured logs
- No custom transport file needed (unlike original ENG-29 spec)
- No performance impact on non-error logs (trace/debug/info flow through Pino only)

### Functional (ENG-30)
- `tracesSampleRate` already set in Phase 01 (dev=1.0, prod=0.1)
- Add `Sentry.startSpan()` around:
  - PDF parsing in `src/app/api/upload/route.ts`
  - AI calls in `src/app/actions/analyze.ts` (CEFR, simplify, questions)
  - DB write operations (passage create, card review update)
- Verify API response times appear in Sentry dashboard

### Non-Functional
- Zero overhead when Sentry disabled
- No duplicate log entries (Pino + Sentry each receive their intended levels)
- Spans add <1ms overhead per operation

## Architecture

### Pino Integration Flow
```
Pino logger (existing)
  ├── trace/debug/info  -->  pino-pretty (dev) / stdout (prod) only
  ├── warn              -->  pino-pretty/stdout + Sentry structured log
  └── error/fatal       -->  pino-pretty/stdout + Sentry error event + structured log
```

### Span Hierarchy
```
POST /api/upload (auto-instrumented by Sentry)
  ├── span: "file-validation"
  ├── span: "pdf-parse"          (Sentry.startSpan)
  ├── span: "ai:cefr-detect"     (Sentry.startSpan)
  ├── span: "ai:content-simplify" (Sentry.startSpan)
  ├── span: "ai:question-gen"    (Sentry.startSpan)
  └── span: "db:passage-create"  (Sentry.startSpan)
```

## Related Code Files

### Modify
- `sentry.server.config.ts` -- add `pinoIntegration()` + `enableLogs: true`
- `sentry.edge.config.ts` -- add `pinoIntegration()` if edge uses Pino (unlikely, verify)
- `instrumentation-client.ts` -- no changes needed (Pino is server-only)
- `src/app/api/upload/route.ts` -- add `Sentry.startSpan()` around PDF parse
- `src/app/actions/analyze.ts` -- add `Sentry.startSpan()` around AI calls + DB write
- `src/app/api/cards/review/route.ts` -- add `Sentry.startSpan()` around DB update
- `src/app/api/study-session/route.ts` -- add `Sentry.startSpan()` around DB ops

### No changes
- `src/lib/core/logger.ts` -- untouched (pinoIntegration hooks into Pino automatically)

## Implementation Steps

1. Update `sentry.server.config.ts`:
   - Add `enableLogs: true` to `Sentry.init()` options
   - Add `Sentry.pinoIntegration()` to integrations array
   - Configure: `{ error: { levels: ['error', 'fatal'] }, log: { levels: ['warn', 'error', 'fatal'] } }`

2. Verify edge config -- if `src/lib/core/logger.ts` is not used in edge runtime, skip `pinoIntegration` in `sentry.edge.config.ts`

3. Add spans to `src/app/api/upload/route.ts`:
   - Wrap `parsePDF(buffer)` with `Sentry.startSpan({ name: 'pdf-parse', op: 'function' }, ...)`
   - Wrap file write with `Sentry.startSpan({ name: 'file-write', op: 'function' }, ...)`

4. Add spans to `src/app/actions/analyze.ts`:
   - Wrap CEFR detection: `Sentry.startSpan({ name: 'ai:cefr-detect', op: 'ai' }, ...)`
   - Wrap simplification: `Sentry.startSpan({ name: 'ai:content-simplify', op: 'ai' }, ...)`
   - Wrap question generation: `Sentry.startSpan({ name: 'ai:question-gen', op: 'ai' }, ...)`
   - Wrap DB passage create: `Sentry.startSpan({ name: 'db:passage-create', op: 'db' }, ...)`

5. Add spans to `src/app/api/cards/review/route.ts`:
   - Wrap `updateCardReview()`: `Sentry.startSpan({ name: 'db:card-review-update', op: 'db' }, ...)`

6. Add spans to `src/app/api/study-session/route.ts`:
   - Wrap DB create in POST: `Sentry.startSpan({ name: 'db:session-create', op: 'db' }, ...)`
   - Wrap DB update in PATCH: `Sentry.startSpan({ name: 'db:session-update', op: 'db' }, ...)`

7. Verify build: `npm run build`

8. Manual verification (if Sentry DSN configured):
   - Trigger upload, verify spans in Sentry dashboard
   - Trigger `log.error()` in a test route, verify appears in Sentry

## Todo List

- [x] Update `sentry.server.config.ts` with pinoIntegration + enableLogs
- [x] Verify edge config needs pinoIntegration
- [x] Add spans to `src/app/api/upload/route.ts`
- [x] Add spans to `src/app/actions/analyze.ts`
- [x] Add spans to `src/app/api/cards/review/route.ts`
- [x] Add spans to `src/app/api/study-session/route.ts`
- [x] Verify `npm run build` passes
- [x] Verify Pino error logs appear in Sentry (if DSN configured)

## Success Criteria

- `pinoIntegration()` configured in server Sentry init
- `log.error()` / `log.fatal()` calls appear as Sentry error events
- `log.warn()` + `log.error()` appear as Sentry structured logs
- Trace/debug/info logs do NOT appear in Sentry (no noise)
- Custom spans visible in Sentry for PDF parse, AI calls, DB writes
- Existing Pino output unchanged in console
- Build passes

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Pino v10 incompatible with pinoIntegration | Low | Medium | Docs say pino `>=8.0.0 <11`; we have v10.3.1 -- compatible |
| Too many logs sent to Sentry | Low | Low | Only warn/error/fatal forwarded; trace/debug/info filtered |
| Span overhead slows API responses | Low | Low | `startSpan` overhead is sub-ms; wrapped ops are already slow (AI calls 1-5s) |
| Duplicate error events (pinoIntegration + manual captureException) | Medium | Low | pinoIntegration error levels = error/fatal; captureException fires on same errors. Sentry deduplicates by stack trace. Acceptable. |

## Security Considerations

- Pino log objects may contain request data -- ensure `beforeSend` (Phase 01) strips PII from log payloads
- AI prompts passed as log context should not contain full user text -- only metadata

## Next Steps

- Phase 04 configures source maps (independent of this phase)
- Phase 05 tests pinoIntegration + span instrumentation
