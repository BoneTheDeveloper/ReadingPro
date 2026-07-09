# Observability Architecture

## Layer Separation

```
lib/errors/      ← Domain errors only
lib/http/        ← HTTP handling
lib/logger.ts   ← Pino logging
lib/observability/ ← Client helpers
```

## Error Handling

Domain errors in `lib/errors/`: `AppError`, `NotFoundError`, `UnauthorizedError`, `ValidationError`, `ConflictError`.

Feature errors extend base in `features/<f>/errors/`.

**Service throws.** **Route catches via `toHttp()`** (401/404/400/409/500 mapping).

## Logging

Pino via `lib/logger.ts`. Use `createModuleLogger()` in services, `createRequestLogger()` in routes.

Request context: `requestId`, `path`, `method`.

`sentry.server.config.ts` bridges pino to Sentry Logs via `pinoIntegration`.

## Sentry

**Issues created only at boundaries:**
- Route errors: `toHttp()` → 500s captured
- Client boundaries: `global-error.tsx`, `error.tsx`
- Client ad-hoc: `captureClientError(err, ctx)`

**No `prismaIntegration`** — Prisma query spans create noise. Failed queries still bubble via `toHttp()`.

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `LOG_LEVEL` | `debug` (dev), `info` (prod) | Minimum log level |
| `NEXT_PUBLIC_SENTRY_DISABLED` | `false` | Disable Sentry |
