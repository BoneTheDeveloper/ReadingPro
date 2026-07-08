# Observability Architecture

## Components

| Component | File | Purpose |
|-----------|------|---------|
| Pino Logger | `src/lib/logger.ts` | Structured server logs with request context |
| Sentry Server | `src/sentry.server.config.ts` | Node.js runtime: error capture + Prisma auto-instrumentation |
| Sentry Edge | `src/sentry.edge.config.ts` | Edge runtime: error capture |
| Sentry Client | `src/instrumentation-client.ts` | Browser: errors, Replay (10% sample), Browser Tracing |
| Error Boundary | `src/lib/http/route-errors.ts` | `toHttp()` — error → HTTP status + Sentry tag |

## Configuration

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

## Error Handling (toHttp)

`toHttp()` is the single boundary that translates all errors:

| Error Type | HTTP Status | Action |
|------------|-------------|--------|
| `AuthenticationRequiredError` | 401 | `{ error: "Authentication required." }` |
| `NotFoundError` | 404 | `{ error: "<resource> not found." }` |
| `ZodError` | 400 | `{ error: getZodErrorMessage(error) }` |
| Service-specific errors | per class | handled before `toHttp` |
| Everything else | 500 | log + Sentry + `{ error: "Internal error." }` |

For non-standard service errors, catch and handle explicitly before `toHttp`:

```typescript
if (error instanceof UploadWorkflowError) {
  return NextResponse.json({ error: error.message }, { status: error.status });
}
return toHttp(error, log, "api:upload");
```

## Sentry Tracing

### Auto-Instrumentation

Sentry auto-instruments:
- Prisma queries (server config)
- HTTP requests (browser tracing)
- React component rendering (client config)
- Console logs (both configs)

### Manual Spans

**Rule: Only span operations that are slow, external, or operationally significant.** Do NOT span auto-instrumented or trivially fast operations.

#### When NOT to Span

| Skip | Reason |
|------|--------|
| `request.json()` | Auto-instrumented by Next.js/Sentry HTTP handling |
| `getUserId()` | Auth is fast; Clerk may auto-instrument |
| JSON parsing | Already covered by HTTP auto-instrumentation |
| Synchronous validation | Microseconds, adds noise not signal |

#### When TO Span

| Include | Reason |
|---------|--------|
| **Database service calls** | Long-running queries need separate p99 tracking |
| **AI/LLM calls** | Variable latency (500ms–30s), high failure risk |
| **File I/O** (upload, parse) | Slow, failure-prone, operationally critical |
| **External API calls** | Network latency and errors need separate visibility |
| **Complex business logic** | Multi-step operations needing granular waterfall |

### Client Instrumentation

Client config enables:
- `replayIntegration` — session replay (10% sample, 100% on error)
- `browserTracingIntegration` — page load and navigation traces
- `spotlightBrowserIntegration` — dev-only local trace viewer
