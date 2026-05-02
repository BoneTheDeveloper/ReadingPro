# Sentry Dashboard Guide

How to navigate the Sentry dashboard to find traces, analyze performance, and debug issues.

---

## Access

1. Go to [sentry.io](https://sentry.io)
2. Select organization: **pham-dac-luc**
3. Select project: **javascript-nextjs**

---

## Dashboard Navigation

### Performance → Traces

**Purpose**: See all transactions, their duration, and child spans.

```
Sidebar → Performance → Traces
```

| Column | What It Shows |
|--------|--------------|
| **Name** | Transaction name (e.g., `POST /api/upload`, `server_action: analyzeContent`) |
| **Duration** | Total time from request start to response |
| **Timestamp** | When the transaction occurred |
| **Status** | HTTP status or error state |
| **User** | Associated user (if `sendDefaultPii` enabled) |

#### How to Read a Trace Waterfall

Click any transaction to see its **trace waterfall**:

```
POST /api/upload                                2.4s  ████████████████████████
├── file-write                                  0.1s  ██
├── pdf-parse                                   0.3s  ███
└── server_action: analyzeContent               1.8s  ██████████████████
    ├── ai:cefr-detect                          0.4s  ████
    ├── ai:content-simplify                     0.6s  ██████
    ├── ai:question-gen                         0.5s  █████
    ├── db:user-lookup                          0.02s ▌
    └── db:passage-create                       0.08s █
```

Each bar shows:
- **Width** = duration relative to total
- **Color** = status (green = ok, red = error, yellow = warning)
- **Indentation** = parent-child relationship

### Filtering Traces

In the Traces view, use the search bar:

| Filter | Example |
|--------|---------|
| By operation | `op:ai` — shows only AI spans |
| By transaction name | `transaction:"POST /api/upload"` |
| By duration | `duration:>1s` — slow requests only |
| By status | `!status:ok` — failed requests only |
| By environment | `environment:production` |

Combined: `transaction:"POST /api/upload" duration:>2s`

### Performance → Transaction Summary

```
Sidebar → Performance → Transactions
```

Shows aggregated stats per transaction name:
- **P50 / P75 / P95 / P99** latency
- **Throughput** (requests per minute)
- **Failure rate**
- **Apdex score** (user satisfaction)

Click a transaction name → see trends over time.

### Performance → Spans

```
Sidebar → Performance → Spans
```

Browse individual spans (not full transactions). Useful to find:
- Slowest `ai:*` spans across all requests
- Average `db:*` query times
- `pdf-parse` duration distribution

### Issues

```
Sidebar → Issues
```

Error events with:
- Stack trace (with source maps if uploaded)
- Breadcrumbs trail (AI calls, DB ops before the error)
- Tags (`route`, `method`)
- Associated transaction (click "View Trace" to see the full trace)

### Logs

```
Sidebar → Logs
```

Pino forwarded logs (Phase 03):
- **Warn/Error/Fatal** → searchable log entries
- Filter by level, timestamp, message content

---

## Key Metrics to Monitor

### For This App

| Metric | Where | Healthy Range |
|--------|-------|--------------|
| `POST /api/upload` P95 | Performance → Transactions | < 5s |
| `ai:cefr-detect` P95 | Performance → Spans | < 2s |
| `ai:content-simplify` P95 | Performance → Spans | < 3s |
| `ai:question-gen` P95 | Performance → Spans | < 3s |
| `db:passage-create` P95 | Performance → Spans | < 500ms |
| `pdf-parse` P95 | Performance → Spans | < 1s |
| Error rate | Issues | < 1% |

### How to Set Alerts

1. **Sidebar → Alerts → Create Alert**
2. Select **"Metric Alert"**
3. Example configs:

| Alert Name | Condition | Threshold |
|-----------|-----------|-----------|
| Slow Upload | `POST /api/upload` duration > threshold | > 8s |
| AI Timeout | `ai:*` span duration | > 10s |
| High Error Rate | Error rate for project | > 5% in 5min |
| DB Slow Query | `db:*` span duration | > 2s |

---

## Debugging Workflow

### Scenario: Upload fails in production

1. **Issues** → find the error → click it
2. Check **breadcrumbs** → see what happened before the error:
   ```
   upload: Writing file to disk
   parse: Parsing PDF file
   ai: Detecting CEFR level
   ← error happened here
   ```
3. Click **"View Trace"** → see the full trace waterfall
4. Identify the slow/failing span → check its duration and status
5. Click the span → see **attributes** (model name, text length, etc.)
6. Check **Logs** for Pino `warn`/`error` messages around the same time

### Scenario: AI calls are slow

1. **Performance → Spans** → filter `op:ai`
2. Sort by **Duration (desc)** → find slowest calls
3. Click span → check `ai.model` attribute, prompt length
4. **Performance → Transactions** → check if it correlates with user-reported slowness
5. Consider: shorter prompts, caching, or fallback to heuristic

---

## Environment Differences

| Feature | Development | Production |
|---------|------------|------------|
| `tracesSampleRate` | 100% | 10% |
| Source maps | Not uploaded | Uploaded in CI |
| Pino level | `debug` | `info` |
| Sentry logs | All warn+ | All warn+ |
| Breadcrumbs | All | All |

**Note**: In development, every request generates a trace. In production, only ~10% are sampled. Use `tracesSampleRate: 1.0` temporarily in prod to debug specific issues, then revert.

---

## Useful Shortcuts

| Action | How |
|--------|-----|
| Find a specific trace by ID | Search bar → paste trace ID |
| Compare two time ranges | Click date picker → "Compare" |
| Export trace data | Transaction detail → "Download" |
| Share a trace | Copy URL (includes trace ID) |
| See all errors for a transaction | Transaction → "Related Issues" |

---

## Project Configuration Reference

| Setting | Value | Where |
|---------|-------|-------|
| Organization | `pham-dac-luc` | `next.config.ts`, `.env.example` |
| Project | `javascript-nextjs` | `next.config.ts`, `.env.example` |
| DSN | From `NEXT_PUBLIC_SENTRY_DSN` | `src/lib/core/sentry.ts` |
| Tunnel route | `/monitoring` | `next.config.ts` |
| Replay on error | 100% | `src/lib/core/sentry.ts` |
| Replay session | 10% | `src/lib/core/sentry.ts` |

---

**Last Updated:** 2026-05-01
