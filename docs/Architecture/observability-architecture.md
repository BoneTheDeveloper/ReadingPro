# Observability Architecture

## Components

| Component | Files | Purpose |
|-----------|-------|---------|
| Sentry | `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation*.ts` | Error capture, spans, source maps. |
| Pino | `src/lib/core/logger.ts` | Structured server logs with request context. |
| Prisma metrics | `src/lib/observability/prisma-query-metrics.ts` | Optional query count/duration diagnostics. |
| Feature performance headers | `src/lib/translation/translate-performance.ts`, `src/lib/dictionary/shared/dictionary-performance.ts` | Benchmark-only route diagnostics. |

## Logging

Use module loggers for reusable modules and request loggers for route handlers. Request log context includes method, path, and request id from `x-request-id` or `x-vercel-id` when present.

## Error Capture

API routes should capture unexpected failures with Sentry tags:

```text
route: api:<feature>
method: GET|POST|PATCH
```

Server actions should use `Sentry.withServerActionInstrumentation` where practical.

## Performance Diagnostics

Dictionary and translation routes can include performance snapshots only when their explicit test/performance gates request them. These headers/fields are for benchmark and regression work, not default product responses.

## References

- Performance benchmarks: [../Testing/performance-benchmarks.md](../Testing/performance-benchmarks.md)
