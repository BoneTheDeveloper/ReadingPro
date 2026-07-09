# Brainstorm — Observability Template B + Error Handling

Date: 2026-07-09 · Plan: `plans/obversibility-update/` · Status: agreed

## Problem
MVP Next.js (Vercel, Node-only). Muốn observability sạch, dễ theo dõi, tránh
phụ thuộc rối của codebase cũ (18 chỗ Sentry rải rác). Chốt template + cách xử lý lỗi.

## Constraints (verified)
- Deploy Node/serverless thuần — KHÔNG edge (no `middleware.ts`, no `runtime='edge'`).
- `@sentry/nextjs ^10.53.0` (pinoIntegration cần >=10.18 ✅), `pino ^10.3.1` (support >=8 <11 ✅).
- `src/lib/logger.ts` là `server-only` → pino không phủ client (bản chất).

## Templates đã cân nhắc
- A Sentry-native (`Sentry.logger` mọi runtime): đơn giản nhất nhưng vứt pino+compactError, mất stdout JSON, lock-in cao. Sentry blog khuyến nghị A vì lý do edge — nhưng edge KHÔNG áp dụng ở đây → lý do yếu.
- **B Pino primary + pinoIntegration (CHỌN)**: giữ pino Node + compactError, bật pinoIntegration bridge log→Sentry Logs, client/edge dùng Sentry trực tiếp.
- C Façade adapter: over-engineering cho MVP, loại.

## Quyết định: Template B
- Giữ nguyên `logger.ts` + `compactError` làm logger chính ở Node.
- Bật `Sentry.pinoIntegration()` → pino logs thành Sentry **Logs** (context), kèm trace ID Node.
- Pino vẫn ra stdout JSON → grep Vercel.
- Client + edge: `Sentry.captureException`/`Sentry.*` trực tiếp cho error (không dùng pino).
- Việc làm: thêm pinoIntegration, check SDK version, đặt quy ước "Node→logger, edge/client→Sentry".

## Xử lý lỗi

### D1 — Double-capture: B1 (boundary owns Issue)
- `pinoIntegration({ error: { levels: [] } })` → pino CHỈ đẩy Logs, KHÔNG auto tạo Issue.
- Issue tạo chủ động tại boundary (`toHttp` / `withAction`) kèm `tags:{route|action}`.
- Bỏ `consoleLoggingIntegration` (đã có pinoIntegration thay).

### Taxonomy (single source of truth)
| Class | HTTP | Issue? | Level |
|-------|------|--------|-------|
| AppError.isOperational | tùy | ❌ | warn |
| NotFoundError | 404 | ❌ | — |
| Auth required | 401 | ❌ | info |
| ZodError | 400 | ❌ | info |
| Unknown Error | 500 | ✅ | error |
Rule: chỉ lỗi bất ngờ (500/bug) mới tạo Issue.

### Boundaries
- Node: `toHttp()` (routes), `withAction()` (server actions) — GIỮ, là nơi capture chính thức.
- Client: `error.tsx`, `global-error.tsx`, `ErrorBoundary` — GIỮ capture.
- Edge: chưa dùng.

### D2 — Helper `captureClientError(err, ctx)`
- Tạo helper chuẩn hóa tag/context cho client (đối xứng `toHttp` phía server).
- Gom các capture client rải rác (vd `use-study-artifacts.ts`) về helper này.

### D3 — Dọn span/breadcrumb tự tạo
- Xóa toàn bộ `Sentry.startSpan`/`addBreadcrumb` thủ công trong `chat-panel.tsx` (tracing tay, không cần cho MVP). Auto-instrumentation của Sentry đủ.

### Dọn dẹp cụ thể
| File | Hành động |
|------|-----------|
| route-errors.ts (toHttp), with-action.ts | GIỮ capture + tag |
| error-boundary.tsx, global-error.tsx, (dashboard)/error.tsx | GIỮ capture |
| api/studio/chat/route.ts:101 (stream callback onFinishPersistError) | CA BIỆT — không qua toHttp; bọc bằng helper capture server nhưng giữ tại chỗ |
| chat-panel.tsx | XÓA span/breadcrumb tự tạo; capture error qua captureClientError |
| use-study-artifacts.ts:66 | chuyển sang captureClientError |

## Rủi ro / lưu ý
- Verify `pinoIntegration` map child-logger binding (`module`, `requestId`) sang attribute Sentry Logs — nếu không, cân nhắc thêm field vào log payload.
- Đảm bảo chỉ 1 nguồn tạo Issue (error.levels=[]) để không trùng.
- `tracesSampleRate: 1` hiện ở mọi runtime → cân nhắc hạ ở prod (ngoài scope xử lý lỗi, ghi chú cho phase config).

## Unresolved
- pinoIntegration có tự gắn tag từ log fields không? (cần test thực tế ở phase-03).
- Có cần `captureServerError` helper cho case stream-callback không, hay inline đủ?
