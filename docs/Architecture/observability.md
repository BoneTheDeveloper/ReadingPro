# Observability Architecture

Hybrid model (Template B / B1): Pino is the primary logger on Node; `pinoIntegration`
bridges pino output into Sentry Logs. Sentry **Issues** are created only at explicit
boundaries — never automatically from log lines — to avoid double-capture.

## Components

| Component | File | Purpose |
|-----------|------|---------|
| Pino Logger | `src/lib/logger.ts` | Structured server logs with request context |
| Sentry Server | `src/sentry.server.config.ts` | Node.js runtime: `prismaIntegration` + `pinoIntegration` (pino → Sentry Logs, no auto-Issue) |
| Sentry Edge | `src/sentry.edge.config.ts` | Edge runtime: error capture (no pino — Node-only) |
| Sentry Client | `src/instrumentation-client.ts` | Browser: errors, Replay (10% sample), Browser Tracing |
| Server Boundary | `src/lib/http/route-errors.ts` | `toHttp()` — error → HTTP status + Sentry Issue (500s only) |
| Server Action Boundary | `src/lib/observability/with-action.ts` | `withAction()` HOF — logs + Sentry Issue for unexpected action errors |
| Client Helper | `src/lib/observability/capture-client-error.ts` | `captureClientError(err, ctx)` — standardized client capture for ad-hoc error paths |

## Configuration

### sentry.server.config.ts (Node-only)

```typescript
integrations: [
  Sentry.prismaIntegration(),
  Sentry.pinoIntegration({
    // B1: pino -> Sentry Logs only. Boundaries (toHttp/withAction) own Issue creation.
    error: { levels: [] },
    log: { levels: ["info", "warn", "error"] },
  }),
],
```

`pinoIntegration` ships in `@sentry/nextjs` (≥10.18, no separate `@sentry/pino`
package). It is **Node-only** — do not add it to `sentry.edge.config.ts` or
`instrumentation-client.ts`. `consoleLoggingIntegration` was removed from the
server config since pino covers server-side logging; it is still present on
edge/client configs where pino does not run.

### next.config.ts

Pino uses worker threads — exclude from bundling:

```typescript
const nextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
};
```

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOG_LEVEL` | `debug` (dev), `info` (prod) | Minimum log level |
| `NEXT_PUBLIC_SENTRY_DISABLED` | `false` | Disable Sentry when set to `1` |

## Request Context

Auto-includes:
- `requestId` — from `x-request-id` / `x-vercel-id` headers, or `crypto.randomUUID()`
- `path` — from `request.nextUrl.pathname`
- `method` — HTTP verb

## Where errors become Issues (boundary map)

Sentry Issues are created **only** at these boundaries — no other code should call
`Sentry.captureException` directly.

| Boundary | File | Behavior |
|----------|------|----------|
| Server route | `toHttp()` (`src/lib/http/route-errors.ts`) | `AuthenticationRequiredError`→401, `NotFoundError`→404, `ZodError`→400 (no Issue); everything else → log.error + Issue + 500 |
| Server action | `withAction()` (`src/lib/observability/with-action.ts`) | `AppError` with `isOperational: true` → warn only, no Issue; unexpected errors → log.error + Issue |
| Server stream callback | `src/app/api/studio/chat/route.ts` (`onFinishPersistError`) | Fire-and-forget persist failure during an AI stream — logged + captured inline (single call site, no helper needed) |
| Client root boundary | `src/app/global-error.tsx` | React root error boundary → Issue |
| Client route boundary | `src/app/[locale]/(dashboard)/error.tsx` | Route-level error boundary → Issue |
| Client component boundary | `src/components/system/error-boundary.tsx` | `ErrorBoundary` with componentStack → Issue |
| Client ad-hoc capture | `captureClientError(err, ctx)` | Used in async/handler error paths outside a boundary (e.g. `use-study-artifacts.ts`, `chat-panel.tsx`) — attaches `{ scope, tags, extra }` |

```typescript
if (error instanceof UploadWorkflowError) {
  return NextResponse.json({ error: error.message }, { status: error.status });
}
return toHttp(error, log, "api:upload");
```

## Sentry Tracing

### Auto-Instrumentation

Sentry auto-instruments:
- Prisma queries (server config, `prismaIntegration`)
- HTTP requests (browser tracing)
- React component rendering (client config)
- Console logs (edge/client configs); server logs via `pinoIntegration`

### Manual spans/breadcrumbs — removed

Hand-written `Sentry.startSpan` / `Sentry.addBreadcrumb` calls have been removed
across the codebase (upload workflow, study chat, translation, dictionary save,
study workspace, etc.). Auto-instrumentation (HTTP, Prisma, browser tracing)
provides sufficient signal for the current scope; re-add targeted spans later
only if a specific performance question requires it.

The one exception is `Sentry.startSpan` in `with-action.ts` — this wraps every
server action as a named `server.action` span and is intentional infrastructure,
not ad-hoc instrumentation.

### User context

`Sentry.setUser({ id })` in `src/lib/auth/auth-server.ts` is retained. It enables
triage ("how many users affected", filter Issues by user) and is not a manual
span/breadcrumb — `sendDefaultPii` only attaches IP/headers, it does not map the
app's user id.

### Client Instrumentation

Client config enables:
- `replayIntegration` — session replay (10% sample, 100% on error)
- `browserTracingIntegration` — page load and navigation traces
- `spotlightBrowserIntegration` — dev-only local trace viewer
