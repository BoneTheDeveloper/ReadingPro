---
phase: 6
title: "Update documentation"
status: completed
priority: P2
effort: "30m"
dependencies: [3, 4, 5]
---

# Phase 6: Update documentation

## Overview

Update `docs/Architecture/observability.md` to the final Template B / B1 model.

## Requirements

- Functional: document pinoIntegration (Node-only), B1 capture model, captureClientError,
  span-removal decision.
- Non-functional: concise, accurate, no stale references.

## Content to update

- Components table: add `pinoIntegration` (server), `captureClientError` helper.
- Config section: server config uses `pinoIntegration({ error:{levels:[]} })`, drop
  consoleLoggingIntegration mention for server.
- Error-handling section: taxonomy (AppError/NotFound/Auth/Zod → no Issue; unknown → Issue),
  boundary map (toHttp, withAction, client boundaries, captureClientError).
- Note: manual spans/breadcrumbs removed; rely on auto-instrumentation.
- Note: `setUser` retained for user triage.

## Related Code Files

- Modify: `docs/Architecture/observability.md`

## Implementation Steps

1. Read current `docs/Architecture/observability.md`.
2. Update components + config + error-handling sections per above.
3. Add short "Where errors become Issues" subsection (single source of truth = boundaries).
4. Verify no broken links / stale `logLevels` / `@sentry/pino` references.

## Success Criteria

- [ ] observability.md reflects Template B / B1.
- [ ] captureClientError + pinoIntegration documented.
- [ ] Taxonomy + boundary map present.
- [ ] No stale API references.
