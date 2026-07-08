# Observability Architecture

## Components

| Component | File | Purpose |
|-----------|------|---------|
| Pino Logger | `src/services/logger.ts` | Structured server logs with request context |
| Sentry Server | `src/sentry.server.config.ts` | Node.js runtime: error capture + Prisma auto-instrumentation |
| Sentry Edge | `src/sentry.edge.config.ts` | Edge runtime: error capture |
| Sentry Client | `src/instrumentation-client.ts` | Browser: errors, Replay (10% sample), Browser Tracing |
| Error Boundary | `src/lib/http/route-errors.ts` | `toHttp()` — error → HTTP status + Sentry tag |

## Request Logging (Pino)

Every API route creates a request logger at the top of the handler:

```typescript
import { createRequestLogContext, createRequestLogger } from "@/services/logger";

export async function POST(request: Request) {
  let requestLog = createRequestLogger(
    "api:vocabulary",
    createRequestLogContext(request, "POST", "/api/vocabulary"),
  );
  // ...
}
```

**Request context includes:**
- `requestId` — from `x-request-id` or `x-vercel-id` headers (Vercel)
- `path` — from `request.nextUrl.pathname` or fallback string
- `method` — HTTP verb

Request loggers are child-loggers scoped to the request. Add domain context via `.child()`:

```typescript
requestLog = requestLog.child({ userId: userId, targetLanguage: "vi" });
```

**Log levels:** `debug`, `info`, `warn`, `error`
- `warn` — invalid JSON, validation failures (Zod issues)
- `error` — unexpected exceptions (caught by `toHttp`)
- `info` — for explicit success markers if needed
- `debug` — detailed development traces (dev only)

**Environment behavior:**
- Development: `pino-pretty` with colorized output, timestamps
- Production: ISO timestamps, JSON format

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
