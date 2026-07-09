---
phase: 3
title: "Update Sentry Config — add pinoIntegration (Node-only)"
status: completed
priority: P1
effort: "30m"
dependencies: []
---

# Phase 3: Update Sentry Config — add pinoIntegration (Node-only)

## Overview

Add `Sentry.pinoIntegration()` to SERVER config only (Node runtime). Bridge pino
logs → Sentry Logs. `error.levels: []` so pino does NOT auto-create Issues (B1:
boundaries own Issue creation → avoids double-capture with toHttp/withAction).

## Requirements

- Functional: pino logs (info/warn/error) appear in Sentry Logs tab, with request context.
- Non-functional: NO duplicate Issues. Edge/client configs unchanged.

## Corrections vs old plan (IMPORTANT)

- `pinoIntegration` ships in **`@sentry/nextjs`** (have `^10.53.0`, needs ≥10.18).
  Do NOT install `@sentry/pino`. Import as `Sentry.pinoIntegration()`.
- Option shape is `{ error: { levels }, log: { levels } }` — NOT `logLevels`.
- `pinoIntegration` is **Node-only** → add to `sentry.server.config.ts` ONLY.
  Do NOT touch `sentry.edge.config.ts`.
- Remove `Sentry.consoleLoggingIntegration()` from SERVER config (pinoIntegration
  supersedes it for pino output). Keep `prismaIntegration`. Keep console integration
  on edge + client (no pino there).

## Architecture

```typescript
// src/sentry.server.config.ts
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  spotlight: process.env.NODE_ENV === "development",
  integrations: [
    Sentry.prismaIntegration(),
    Sentry.pinoIntegration({
      // B1: pino → Sentry Logs only. Boundaries create Issues.
      error: { levels: [] },
      log: { levels: ["info", "warn", "error"] },
    }),
  ],
  sendDefaultPii: true,
  tracesSampleRate: 1,   // TODO(config): consider lowering in prod (separate concern)
  enableLogs: true,
  debug: false,
});
```

## Related Code Files

- Modify: `src/sentry.server.config.ts` (add pinoIntegration, drop consoleLoggingIntegration)
- Verify only (no change): `src/sentry.edge.config.ts`, `src/instrumentation-client.ts`

## Implementation Steps

1. Confirm `@sentry/nextjs ^10.53.0` exports `pinoIntegration` (typecheck import).
2. Edit `sentry.server.config.ts`: replace `consoleLoggingIntegration()` with
   `pinoIntegration({ error: { levels: [] }, log: { levels: ["info","warn","error"] } })`.
3. Leave edge + client configs untouched.
4. `pnpm run typecheck`.

## Success Criteria

- [ ] `pinoIntegration` in server config, `error.levels: []`.
- [ ] `consoleLoggingIntegration` removed from server config only.
- [ ] Edge/client configs unchanged.
- [ ] Typecheck passes.

## Risk Assessment

- **Risk**: pinoIntegration doesn't map child-logger bindings (`module`, `requestId`)
  to Sentry Log attributes. **Mitigation**: after deploy, verify a log in Sentry Logs
  shows context; if missing, enrich log payload with explicit fields. (Unresolved — verify.)
- **Risk**: removing consoleLoggingIntegration drops any direct `console.*` → Sentry.
  **Mitigation**: codebase uses pino, not console; acceptable for MVP.
