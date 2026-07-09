# Pino + Sentry — Bản đồ toàn vẹn hệ thống (Inventory)

_Ngày: 2026-07-09 · Phạm vi: toàn bộ file thuộc pino/sentry + call site import logger/raw Sentry._
_Mục đích: đảm bảo tính toàn vẹn khi thay đổi — không chỉ sửa module lẻ._

## 0. Phiên bản

| Package | Version | Ghi chú |
|---|---|---|
| `@sentry/nextjs` | ^10.53.0 | `pinoIntegration` cần ≥10.18 → OK |
| `pino` | ^10.3.1 | logger chính (Node-only) |
| `pino-pretty` | ^13.1.3 | dev transport |

---

## 1. Tầng CONFIG / BOOTSTRAP (5 file) — nạp một lần khi khởi động

| File | Vai trò | Runtime | Điểm mấu chốt |
|---|---|---|---|
| `src/instrumentation.ts` | Router nạp config theo runtime + `onRequestError = Sentry.captureRequestError` | Node/Edge | Auto-capture lỗi request cấp Next |
| `src/sentry.server.config.ts` | init Node: `prismaIntegration` + `pinoIntegration({error:{levels:[]}, log:{info,warn,error}})` | Node | pino→Logs, **không** auto-Issue; boundary tự tạo Issue |
| `src/sentry.edge.config.ts` | init Edge: `consoleLoggingIntegration` (không pino — không chạy Node) | Edge | pino KHÔNG có ở đây |
| `src/instrumentation-client.ts` | init Browser: replay(10%) + consoleLogging + browserTracing + spotlight(dev) + `onRouterTransitionStart` | Client | `enableLogs:true`, `sendDefaultPii:true` |
| `next.config.ts` | `withSentryConfig` (org/project/authToken/tunnelRoute `/monitoring`) + `serverExternalPackages:["pino","pino-pretty"]`* | build | *xác nhận dòng serverExternalPackages còn tồn tại |

**Gate cấu hình chung:** cả 3 config init đều bọc trong `if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED)`. Đổi 1 env này = tắt toàn bộ 3 runtime.

---

## 2. Tầng CORE MODULE (2 file) — nguồn duy nhất

| File | Export | Ai dùng |
|---|---|---|
| `src/lib/logger.ts` | `logger`, `createModuleLogger`, `createRequestLogger`, `createRequestLogContext`, `AppError`, `compactError` | Toàn bộ service + route + with-action |
| — | 1 instance `pino()` duy nhất; child theo module/request; serializer `err`/`error`=`compactError` | — |

`AppError.isOperational` là hợp đồng ngầm giữa `logger.ts` ↔ `with-action.ts` (phân loại warn vs Issue).

---

## 3. Tầng BOUNDARY / HELPER (3 file) — nơi DUY NHẤT được tạo Issue (server + ad-hoc)

| File | Hàm | Hành vi Issue |
|---|---|---|
| `src/lib/http/route-errors.ts` | `toHttp(error, log, route)` + `NotFoundError` | 401/404/400 (no Issue); còn lại → `log.error` + `captureException{tags:{route}}` + 500 |
| `src/lib/observability/with-action.ts` | `withAction(name, fn)` | wrap `startSpan(server.action)`; `AppError` operational → warn; khác → `log.error`+`captureException{tags:{action}, extra:{requestId}}` |
| `src/lib/observability/capture-client-error.ts` | `captureClientError(err, ctx)` | `captureException{tags:{scope,...}, extra}` — đối xứng client của toHttp |

---

## 4. Tầng BOUNDARY CLIENT + AUTH (4 file) — raw `captureException`/`setUser`

| File | Loại | Call |
|---|---|---|
| `src/app/global-error.tsx` | React root boundary | `captureException(error)` trong `useEffect` |
| `src/app/[locale]/(dashboard)/error.tsx` | Route boundary | `captureException(error)` trong `useEffect` |
| `src/components/system/error-boundary.tsx` | Component boundary (class) | `captureException(error,{contexts:{react:{componentStack}}})` |
| `src/lib/auth/auth-server.ts` | User context | `Sentry.setUser({id})` ×2 (getUserId, getCurrentUser) |

---

## 5. Tầng CONSUMER (11 file) — chỉ import LOGGER, KHÔNG tự capture (đúng chuẩn)

`createRequestLogger` (route có request context):
- `src/app/api/health/route.ts`
- `src/app/api/local-blob/[pathname]/route.ts`
- `src/app/api/translate/route.ts`
- `src/features/reading/services/inline-translate.service.ts`

`createModuleLogger` (service tầng dưới):
- `src/features/ai-chat/services/chat-service.ts`
- `src/features/passage/services/passage-study.service.ts`
- `src/features/reading/db/translation-provider.ts`
- `src/features/users/db/sync-user.ts`
- `src/features/vocabulary/services/vocabulary-items.service.ts`
- `src/services/ai/question-generator.ts`
- `src/services/storage.ts`

**Ngoại lệ hợp lệ (1 file, vừa logger vừa raw Sentry):**
- `src/app/api/studio/chat/route.ts` — dùng `createRequestLogger` + `createRequestLogContext`; điểm `onFinishPersistError` gọi `captureException` inline (fire-and-forget trong stream, không đi qua toHttp/withAction). Đây là chỗ **duy nhất** ngoài boundary chuẩn tạo Issue ở server.

---

## 6. Bản đồ luồng (2 kênh tách biệt)

```
                         ┌──────── Kênh LOGS (pino) ────────┐
service/repo/route ──► log.<level>({err?,context?}, "msg") ──► pinoIntegration ──► Sentry Logs
     │ throw
     ▼
  BOUNDARY ─────────────► Kênh ISSUES: captureException ─────────► Sentry Issues
  (toHttp / withAction / client boundaries / studio-chat inline)
```

Nguyên tắc: **consumer chỉ log + throw; chỉ boundary tạo Issue.** 11/11 consumer tuân thủ.

---

## 7. RỦI RO TOÀN VẸN (cần biết trước khi đổi module)

| # | Vấn đề | File | Mức |
|---|---|---|---|
| R1 | **4 chỗ `console.error` client nuốt lỗi**, KHÔNG qua `captureClientError` → mất khỏi Sentry | `quiz-results.tsx:65`, `studio-panel.tsx:440`, `use-upload-submit.ts:17,30` | Trung bình — lỗ hổng quan sát client |
| R2 | 3 client boundary gọi `captureException` trực tiếp thay vì `captureClientError` | global-error, error.tsx, error-boundary | Thấp — boundary có ngữ nghĩa riêng (reset/componentStack), chấp nhận được nhưng lệch helper |
| R3 | ~~Edge runtime không có pino~~ → **đã xác minh: KHÔNG có route nào `runtime="edge"`** → không rủi ro hiện tại. Chỉ lưu ý nếu sau này thêm route Edge import logger | — | ✅ Đã loại (verified) |
| R4 | Tắt Sentry chỉ qua `NEXT_PUBLIC_SENTRY_DISABLED`; không có cờ tắt riêng Logs vs Issues | 3 config init | Thấp — chủ ý |
| R5 | ~~thiếu serverExternalPackages~~ → **đã xác minh: `next.config.ts:58` CÓ `serverExternalPackages:["pino","pino-pretty"]`** | next.config.ts:58 | ✅ Đã loại (verified) |

---

## 8. Tổng kết số lượng

- **Config/bootstrap:** 5 · **Core module:** 2 · **Boundary/helper server:** 3 · **Boundary client + auth:** 4 · **Consumer logger:** 11 (1 kiêm inline Sentry) · **Bypass (console.error):** 4 vị trí / 3 file.
- **Tổng import `@sentry`:** 10 file · **Tổng import `@/lib/logger`:** 14 file.

---

## Câu hỏi chưa giải đáp

1. ✅ Đã xác minh: `next.config.ts:58` có `serverExternalPackages` — R5 loại.
2. ✅ Đã xác minh: không có route Edge — R3 loại.
3. 4 chỗ `console.error` (R1) — muốn giữ nguyên hay chuẩn hoá về `captureClientError`? _(rủi ro thực còn lại duy nhất)_
4. Có dùng song song `Sentry.logger.*` (structured Logs API) không, hay pino là nguồn log duy nhất?
