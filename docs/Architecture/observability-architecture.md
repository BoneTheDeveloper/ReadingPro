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

## Request Logging (Pino)

### Route Handler Pattern

Create module logger once at top-level, request logger per handler:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { toHttp } from "@/lib/http/route-errors";

const MODULE = "api/vocabulary";

export async function POST(request: NextRequest) {
  const log = createRequestLogger(
    MODULE,
    createRequestLogContext(request, "POST", "/api/vocabulary"),
  );

  try {
    const body = await request.json();
    log.info({ context: { bodySize: JSON.stringify(body).length } }, "processing request");

    // ... business logic ...

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error(error as Error, "request failed");
    return toHttp(error, log, MODULE);
  }
}
```

### Request Context

Auto-includes:
- `requestId` — from `x-request-id` / `x-vercel-id` headers, or `crypto.randomUUID()`
- `path` — from `request.nextUrl.pathname`
- `method` — HTTP verb

### Adding Domain Context

```typescript
const log = createRequestLogger(MODULE, context);
const scopedLog = log.child({ userId: userId, targetLanguage: "vi" });
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `debug` | Detailed flow, payload traces (dev only) |
| `info` | Successful business events |
| `warn` | Recoverable anomalies (validation fail, retry, fallback) |
| `error` | Exceptions needing human attention |

### Log Conventions

- **Pass Error directly:** `log.error(error, "message")` — logger auto-serializes
- **Context data in fields:** `log.info({ context: { orderId } }, "order created")`
- **Messages lowercase:** `"order created"`, `"payment failed"`, `"validation failed"`
- **No PII in logs:** Skip passwords, full emails, tokens

### Passing Logger to Service Layer

Don't create loggers inside services — receive from caller to preserve requestId:

```typescript
// lib/services/order-service.ts
import type { ContextLogger } from "@/lib/logger";

export async function createOrder(data: OrderInput, log: ContextLogger) {
  const serviceLog = log.child({ service: "order" });
  serviceLog.debug({ context: { sku: data.sku } }, "validating order");
  // ...
}
```

```typescript
// app/api/orders/route.ts
const order = await createOrder(body, log);
```

### Server Actions

Server actions have no `NextRequest` — extract headers manually:

```typescript
"use server";
import { headers } from "next/headers";
import { createRequestLogger } from "@/lib/logger";

export async function updateProfile(formData: FormData) {
  const h = await headers();
  const log = createRequestLogger("actions/update-profile", {
    requestId: h.get("x-request-id") ?? crypto.randomUUID(),
    method: "ACTION",
  });

  log.info("updating profile");
  // ...
}
```

### Module-Level Logs (No Request Context)

For scripts, cron jobs, or module init:

```typescript
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("jobs/cleanup");
log.info({ deleted: 42 }, "cleanup finished");
```

Or use the root logger for one-time boot events:

```typescript
import { logger } from "@/lib/logger";
logger.info("app booted");
```

### Environment Behavior

- **Development:** `pino-pretty` with colorized output, timestamps
- **Production:** ISO timestamps, JSON format, compact stack traces (max 6 lines)

**Current coverage:** 21/24 API routes use `createRequestLogger`.

## Error Handling (toHttp)

All API routes route unexpected errors through `toHttp`:

```typescript
import { toHttp } from "@/lib/http/route-errors";

export async function POST(request: Request) {
  try {
    // ...
  } catch (error) {
    return toHttp(error, requestLog, "api:vocabulary");
  }
}
```

**`toHttp` translation table:**

| Error Type | HTTP Status | Action |
|------------|-------------|--------|
| `AuthenticationRequiredError` | 401 | `{ error: "Authentication required." }` |
| `NotFoundError` | 404 | `{ error: "<resource> not found." }` |
| `ZodError` | 400 | `{ error: getZodErrorMessage(error) }` |
| Service-specific errors | per class | handled before `toHttp` |
| Everything else | 500 | log + Sentry + `{ error: "Internal error." }` |

**For non-standard service errors**, catch and handle explicitly before `toHttp`:

```typescript
if (error instanceof UploadWorkflowError) {
  return NextResponse.json({ error: error.message }, { status: error.status });
}
return toHttp(error, requestLog, "api:upload");
```

**Current coverage:** 15/24 API routes use `toHttp`.

## Sentry Tracing

Sentry auto-instruments:
- Prisma queries (server config)
- HTTP requests (browser tracing)
- React component rendering (client config)
- Console logs (both configs)

### Manual Spans

For key operations, wrap with `Sentry.startSpan`:

```typescript
import * as Sentry from "@sentry/nextjs";

// Body parsing
const body = await Sentry.startSpan(
  { name: "api:vocabulary-parse-body", op: "http.server" },
  () => request.json(),
);

// Auth
const userId = await Sentry.startSpan(
  { name: "api:vocabulary-authenticate", op: "auth" },
  () => getUserId(),
);

// Service call
const dto = await Sentry.startSpan(
  { name: "vocabulary-save", op: "db.write" },
  () => saveVocabularyItem(input),
);
```

Span naming convention: `api:<route>[-<sub-operation>]`

**Current coverage:** 16/24 API routes have manual `Sentry.startSpan`.

### Client Instrumentation

Client config enables:
- `replayIntegration` — session replay (10% sample, 100% on error)
- `browserTracingIntegration` — page load and navigation traces
- `spotlightBrowserIntegration` — dev-only local trace viewer

### Disabling Sentry

Set `NEXT_PUBLIC_SENTRY_DISABLED=1` to disable all Sentry initialization.

## Route Coverage Summary

| Route | Logger | toHttp | Sentry Spans |
|-------|--------|--------|--------------|
| `/api/dictionary/*` | ✅ | ✅ | ✅ |
| `/api/vocabulary/*` | ✅ | ✅ | ✅ |
| `/api/studio/*` | ✅ | ❌ | ❌ |
| `/api/upload/*` | ✅ | ❌ | ❌ |
| `/api/translate` | ✅ | ✅ | ✅ |
| `/api/learning-session` | ✅ | ✅ | ✅ |
| `/api/progress/*` | ✅ | ❌ | ❌ |
| `/api/health` | ❌ | ❌ | ❌ |
| `/api/local-blob/*` | ❌ | ❌ | ❌ |
| `/api/webhooks/clerk` | ❌ | ❌ | ❌ |

**Coverage:** 21/24 routes have request logging, 15/24 have error boundaries, 16/24 have manual spans.
