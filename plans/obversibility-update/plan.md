---
title: "Pino primary + selective Sentry capture (Template B / B1)"
description: "Bridge Pino→Sentry via pinoIntegration (Node-only), add captureClientError helper, remove manual spans/breadcrumbs. Boundaries own Issue creation."
status: completed
priority: P2
branch: "preview"
tags: ["observability", "sentry", "pino", "refactor"]
blockedBy: []
blocks: []
created: "2026-07-09T03:32:26.546Z"
createdBy: "ck:plan"
source: skill
---

# Pino primary + selective Sentry capture (Template B / B1)

## Overview

Hybrid observability, Node-only deploy (no edge runtime). Pino = primary logger ở Node;
`pinoIntegration` bridge pino→Sentry Logs. Issue tạo CHỦ ĐỘNG tại boundary
(`toHttp`/`withAction` server, error boundaries + `captureClientError` client).
`pinoIntegration.error.levels: []` → pino KHÔNG auto tạo Issue (tránh double-capture).

## Architecture

```
NODE (server, serverless):
  service throw → toHttp() | withAction() → 4xx (no Issue) | 500 (log.error + captureException{tags})
  pino.* → stdout JSON  +  pinoIntegration → Sentry Logs   (error.levels: [])

CLIENT (browser):
  render error → error.tsx / global-error.tsx / ErrorBoundary → captureException  (KEEP)
  async/handler error → captureClientError(err, ctx)                              (NEW helper)

EDGE: chưa dùng. pinoIntegration là Node-only → KHÔNG thêm vào edge config.
```

## Key Decisions (brainstorm 260709)

- Template **B**: giữ pino + `compactError`, không đụng `logger.ts`.
- **B1**: boundary owns Issue; `pinoIntegration({ error: { levels: [] } })`.
- Tạo helper `captureClientError(err, ctx)` chuẩn hoá capture client.
- **Dọn** toàn bộ `Sentry.startSpan`/`addBreadcrumb` tự tạo (~13 file). Auto-instrumentation đủ.
- Giữ boundary hợp lệ: `toHttp`, `withAction`, `error.tsx`, `global-error.tsx`, `ErrorBoundary`.
- `Sentry.setUser` (auth-server.ts): **GIỮ** (confirmed by user) — user context giúp triage ("N users affected", filter theo user). Không phải "manual span"; sendDefaultPii chỉ đính IP/headers, không map user id app.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Setup-AppError](./phase-01-setup.md) | Completed (đã có sẵn trong logger.ts) |
| 2 | [withAction HOF](./phase-02-create-withaction.md) | Completed (đã có sẵn) |
| 3 | [Update-Sentry-Config](./phase-03-update-sentry-config.md) | Completed |
| 4 | [captureClientError + convert captures + tests](./phase-04-remove-manual-sentry.md) | Completed (tests skipped — no test runner configured, see note) |
| 5 | [Remove manual spans/breadcrumbs](./phase-05-remove-spans.md) | Completed |
| 6 | [Update-docs](./phase-06-update-docs.md) | Completed |

## Dependencies

None - self-contained refactor. Phase 3 independent; 4→5; 6 last.

## Ref
- Brainstorm: `./reports/brainstorm-260709-error-handling-template-b.md`
- Sentry pino docs: pinoIntegration requires @sentry/nextjs ≥10.18 (have ^10.53), Node-only.
