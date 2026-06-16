# Sentry Trace Following Guide

How Sentry distributed tracing works in this app, how spans are structured, and how to add new spans.

---

## Architecture Overview

```
User Request (Browser)
    │
    ▼
Next.js Server (auto-instrumented by @sentry/nextjs)
    │
    ├── Server Action / API Route (root transaction)
    │       │
    │       ├── Sentry.startSpan({ op: 'ai' })      ← AI calls
    │       ├── Sentry.startSpan({ op: 'db' })       ← DB queries
    │       ├── Sentry.startSpan({ op: 'function' })  ← file ops, parsing
    │       │
    │       └── Sentry.addBreadcrumb(...)              ← lightweight trail
    │
    ▼
Sentry Dashboard → Performance → Traces
```

---

## Key Concepts

### Transaction vs Span

| Concept | What | Example |
|---------|------|---------|
| **Transaction** | Root unit of work (auto-created by Next.js) | `GET /api/upload`, `server_action: analyzeContent` |
| **Span** | Child operation inside a transaction | `ai:cefr-detect`, `db:passage-create` |
| **Breadcrumb** | Lightweight event log (no duration) | `"Detecting CEFR level"`, `"Writing file to disk"` |

### Sample Rates

Configured in `src/lib/core/sentry.ts`:

| Environment | `tracesSampleRate` | Meaning |
|-------------|-------------------|---------|
| Development | `1.0` (100%) | Every transaction sent |
| Production | `0.1` (10%) | 1 in 10 transactions sent |

---

## Current Span Coverage

### AI Operations (`op: 'ai'`)

| Span Name | File | What It Measures |
|-----------|------|-----------------|
| `ai:cefr-detect` | `src/app/actions/analyze.ts:35,147` | Gemini call to detect CEFR level |
| `ai:content-simplify` | `src/app/actions/analyze.ts:56,164` | Gemini call to simplify text |
| `ai:question-gen` | `src/app/actions/analyze.ts:76,183` | Gemini call to generate questions |

### Database Operations (`op: 'db'`)

| Span Name | File | What It Measures |
|-----------|------|-----------------|
| `db:user-lookup` | `src/app/actions/analyze.ts:89,196` | Find or create user |
| `db:passage-create` | `src/app/actions/analyze.ts:96,203` | Create passage with questions |
| `db:session-ensure-active` | `src/app/api/study-session/route.ts:21` | Ensure or create an active study session |
| `db:card-review-update` | `src/app/api/cards/review/route.ts:26` | Upsert card review (SM-2) |

### File/Function Operations (`op: 'function'`)

| Span Name | File | What It Measures |
|-----------|------|-----------------|
| `file-write` | `src/app/api/upload/route.ts:48` | Write uploaded file to disk |
| `pdf-parse` | `src/app/api/upload/route.ts:56` | Extract text from PDF buffer |

---

## Trace Hierarchy Example

A typical `/api/upload` request produces this trace:

```
Transaction: POST /api/upload                        ← auto by Next.js
├── span: file-write (op: function)                  ← write to disk
├── span: pdf-parse (op: function)                   ← extract text
└── Transaction: server_action: analyzeContent       ← auto by withServerActionInstrumentation
    ├── span: ai:cefr-detect (op: ai)                ← Gemini CEFR call
    ├── span: ai:content-simplify (op: ai)           ← Gemini simplify call
    ├── span: ai:question-gen (op: ai)               ← Gemini questions call
    ├── span: db:user-lookup (op: db)                ← Prisma findUnique/create
    └── span: db:passage-create (op: db)             ← Prisma create
```

A typical `/api/cards/review` request:

```
Transaction: POST /api/cards/review                  ← auto by Next.js
└── span: db:card-review-update (op: db)             ← Prisma upsert
```

---

## How to Add New Spans

### Basic Pattern

```typescript
import * as Sentry from '@sentry/nextjs';

const result = await Sentry.startSpan(
  { name: 'descriptive-name', op: 'category' },
  async () => {
    return await someExpensiveOperation();
  }
);
```

### With Attributes (for filtering in dashboard)

```typescript
const result = await Sentry.startSpan(
  {
    name: 'ai:question-gen',
    op: 'ai',
    attributes: {
      'ai.model': 'gemini-1.5-flash',
      'passage.word_count': text.split(/\s+/).length,
    },
  },
  async () => {
    return await generateObject({ /* ... */ });
  }
);
```

### Conditional Span (only if parent exists)

```typescript
await Sentry.startSpan(
  { name: 'optional-work', op: 'function', onlyIfParent: true },
  async () => {
    // This span only appears if there's already an active transaction
    // Useful for code that runs in both traced and non-traced contexts
  }
);
```

### Standalone Transaction (background jobs)

```typescript
await Sentry.startSpan(
  { name: 'cleanup-expired-sessions', op: 'job', forceTransaction: true },
  async () => {
    await db.studySession.deleteMany({
      where: { completedAt: null, startedAt: { lt: oneHourAgo } },
    });
  }
);
```

---

## Naming Conventions

| `op` Value | Use For | Name Format |
|-----------|---------|-------------|
| `ai` | Gemini AI calls | `ai:<action>` (e.g., `ai:cefr-detect`) |
| `db` | Prisma/database queries | `db:<action>` (e.g., `db:user-lookup`) |
| `function` | File ops, parsing, processing | `descriptive-name` (e.g., `pdf-parse`) |
| `http.client` | External HTTP requests | `http.client:<domain>` |
| `job` | Background/cron tasks | `job:<task-name>` |

---

## Adding Breadcrumbs

Breadcrumbs are lightweight logs attached to errors. They don't measure duration:

```typescript
Sentry.addBreadcrumb({
  category: 'ai',              // Group: ai, db, upload, parse
  message: 'Detecting CEFR level',
  level: 'info',               // info, warning, error
  data: { textLength: text.length },  // Optional extra context
});
```

---

## Server Action Tracing

Server actions are auto-traced via `withServerActionInstrumentation`:

```typescript
export async function myAction(formData: FormData) {
  return Sentry.withServerActionInstrumentation('myAction', {
    headers: await headers(),
  }, async () => {
    // All spans here are children of the server_action transaction
    await Sentry.startSpan({ name: 'db:query', op: 'db' }, async () => { /* ... */ });
  });
}
```

This links the client-side navigation to the server-side work in a single trace.

---

## Configuration Files

| File | Purpose |
|------|---------|
| `src/lib/core/sentry.ts` | Shared config: DSN, sample rates, PII stripping |
| `sentry.server.config.ts` | Server init: Pino integration, `Sentry.init()` |
| `sentry.edge.config.ts` | Edge runtime init |
| `next.config.ts` | Source maps upload, webpack options |
| `.env.example` | Required env vars documentation |

---

## Don'ts

- **Don't** use `Sentry.startTransaction()` — deprecated. Use `startSpan` with `forceTransaction: true`
- **Don't** call `span.finish()` manually — `startSpan` auto-ends when callback returns
- **Don't** wrap trivial sync code (< 1ms) — only wrap expensive operations
- **Don't** put secrets in span attributes — they're sent to Sentry
- **Don't** nest spans deeper than 4-5 levels — hard to read in dashboard
