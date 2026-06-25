# Observability Architecture

## Components

| Component | Files | Purpose |
|-----------|-------|---------|
| Sentry | `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation*.ts` | Error capture, spans, source maps. |
| Pino | `src/server/observability/logger.ts` | Structured server logs with request context. |

## Logging

Use module loggers for reusable modules and request loggers for route handlers. Request log context includes method, path, and request id from `x-request-id` or `x-vercel-id` when present.

## Error Capture

API routes should capture unexpected failures with Sentry tags:

```text
route: api:<feature>
method: GET|POST|PATCH
```

Server actions should use `Sentry.withServerActionInstrumentation` where practical.
