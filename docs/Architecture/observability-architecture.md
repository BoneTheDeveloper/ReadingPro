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

**Mandatory structure** — every API route handler MUST follow this exact pattern:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createRequestLogContext, createRequestLogger } from "@/lib/logger";
import { toHttp } from "@/lib/http/route-errors";

// (1) MODULE constant — top-level, separator = `:`
const MODULE = "api:vocabulary";

export async function POST(request: NextRequest) {
  // (2) Logger init — variable name = `log`
  const log = createRequestLogger(
    MODULE,
    createRequestLogContext(request, "POST", "/api/vocabulary"),
  );

  try {
    // ... business logic (Zod, auth, JSON parse — optional per route) ...

    // (3) Success shape — always `{ success: true, data }`
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    // (4) Error handling — always `toHttp(error, log, MODULE)`
    return toHttp(error, log, MODULE);
  }
}
```

**Flexible middle section** — what goes inside `try` is per-route:
- Zod schema validation (optional)
- Auth checks (optional)
- JSON parse guards (optional)
- Business logic (required)

These are NOT enforced by convention — include when needed.
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


## Error Handling (toHttp)

All API routes route unexpected errors through `toHttp`:

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
return toHttp(error, log, "api:upload");
```
## Sentry Tracing

Sentry auto-instruments:
- Prisma queries (server config)
- HTTP requests (browser tracing)
- React component rendering (client config)
- Console logs (both configs)

### Manual Spans (Value Over Coverage)

**Rule: Only span operations that are slow, external, or operationally significant.** Do NOT span auto-instrumented or trivially fast operations.

#### When NOT to span

| Skip | Reason |
|------|--------|
| `request.json()` | Auto-instrumented by Next.js/Sentry HTTP handling |
| `getUserId()` | Auth is fast; Clerk may auto-instrument |
| JSON parsing | Already covered by HTTP auto-instrumentation |
| Synchronous validation | Microseconds, adds noise not signal |

#### When TO span

| Include | Reason |
|---------|--------|
| **Database service calls** | Long-running queries need separate p99 tracking |
| **AI/LLM calls** | Variable latency (500ms–30s), high failure risk |
| **File I/O** (upload, parse) | Slow, failure-prone, operationally critical |
| **External API calls** | Network latency and errors need separate visibility |
| **Complex business logic** | Multi-step operations needing granular waterfall |

#### Naming Convention

- **AI operations:** `ai:<operation-name>` (e.g., `ai:content-simplify`, `ai:question-gen`)
- **DB operations:** `db:<entity>-<operation>` (e.g., `db:vocabulary-save`, `db:session-ensure-active`)
- **Storage/File:** `<operation-type>:<description>` (e.g., `storage-upload`, `pdf-parse`)

### Client Instrumentation

Client config enables:
- `replayIntegration` — session replay (10% sample, 100% on error)
- `browserTracingIntegration` — page load and navigation traces
- `spotlightBrowserIntegration` — dev-only local trace viewer
