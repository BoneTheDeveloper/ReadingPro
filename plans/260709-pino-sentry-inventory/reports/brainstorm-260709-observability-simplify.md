# Bản thiết kế: Kiến trúc Error + Route Wrapper đơn giản hóa

_Ngày: 2026-07-09 · Tác giả: brainstorm · Trạng thái: approved_

---

## 1. Problem Statement

Hệ thống observability hiện tại có 3 vấn đề:

1. **Layer inversion**: `NotFoundError` sống trong `lib/http/route-error-handler.ts` — domain/service import từ HTTP layer
2. **Duplicate capture**: `withAction` gọi `Sentry.captureException` → re-throw → `onRequestError` capture lại = double Issue
3. **Prisma noise**: `prismaIntegration()` ghi mọi query như performance span, tạo noise không cần thiết

---

## 2. Architecture Decisions

### 2.1 Layer Separation (locked)

```
Request ──► [Route] ──► [Service] ──► [Route: wrap] ──► Response
              │            │
              │            └─ throw DomainError (không biết HTTP)
              │
              └─ (error bubbles) ──► [withRoute] ──► toHttp() ──► HTTP status
```

**Quy tắc bất biến:**
- `lib/errors/` — KHÔNG import next/*, @sentry/*, hay bất cứ thứ gì trong lib/http
- `lib/http/` — import từ lib/errors để map → HTTP
- Service/Repository — chỉ throw, không gọi toHttp, không biết HTTP

### 2.2 Error Architecture — Level 2

```
lib/errors/
├─ base.error.ts          ← AppError (base, isOperational flag)
├─ not-found.error.ts      ← NotFoundError extends AppError
├─ unauthorized.error.ts  ← UnauthorizedError extends AppError
└─ index.ts               ← barrel: export * from "./..."

features/passage/errors/
├─ passage-not-found.error.ts   ← ArtifactNotFoundError extends NotFoundError
└─ passage-service.error.ts     ← PassageStudyServiceError extends AppError (có code)

features/ai-chat/errors/
└─ chat-service.error.ts        ← StudyChatServiceError extends AppError

features/vocabulary/errors/
└─ vocabulary-service.error.ts   ← VocabularyServiceError extends AppError

features/upload/errors/
└─ upload-workflow.error.ts     ← UploadWorkflowError extends AppError (bỏ status field)
```

**Base class (base.error.ts):**
```typescript
export class AppError extends Error {
  isOperational = true;  // toHttp: operational = silent (no Sentry Issue)
}
```

### 2.3 toHttp — chỉ match base classes

```typescript
export function toHttp(error: unknown, log, route): NextResponse {
  if (error instanceof UnauthorizedError) return json(401);
  if (error instanceof NotFoundError) return json(404);
  if (error instanceof ValidationError) return json(400);
  if (error instanceof ConflictError) return json(409);

  // AppError (operational) → 500, silent
  // raw Error → 500 + log + Sentry
  log.error({ err: error }, `${route} failed`);
  Sentry.captureException(error, { tags: { route } });
  return json(500);
}
```

**toHttp KHÔNG biết** `StudyChatServiceError`, `PassageStudyServiceError`, `VocabularyServiceError`. Những cái đó → 500 (fallback).

### 2.4 withRoute wrapper

```typescript
// lib/http/with-route.ts
export function withRoute(routeName: string, fallbackPath: string) {
  return (handler: (req: NextRequest, ctx: RouteContext, log: ContextLogger) => Promise<NextResponse>) => {
    return async (req: NextRequest, ctx: RouteContext) => {
      const log = createRequestLogger(
        routeName,
        createRequestLogContext(req, req.method, fallbackPath),
      );
      try {
        return await handler(req, ctx, log);
      } catch (error) {
        return toHttp(error, log, routeName);
      }
    };
  };
}
```

**Áp dụng cho:** `/api/translate` (non-streaming JSON)
**KHÔNG áp dụng:** `/api/studio/chat` (streaming — headers flush trước khi stream bắt đầu)

### 2.5 Streaming route — tách biệt 2 loại lỗi

```
1. Pre-stream (getOwnedPassageForChat): NotFoundError → headers chưa flush → toHttp 404 ✅
2. In-stream (onFinishPersistError): error event trong stream → inline handler, KHÔNG toHttp ✅
```

**Sau refactor:**
- `StudyChatServiceError("Passage not found.")` → `NotFoundError("Passage")` ở service
- Route bỏ `instanceof StudyChatServiceError` check
- `onFinishPersistError` callback giữ nguyên inline Sentry capture (không throw)

### 2.6 Prisma noise — remove prismaIntegration

```typescript
// sentry.server.config.ts
Sentry.init({
  // XÓA: Sentry.prismaIntegration()
  // Failed queries throw JS exceptions → captured via toHttp / onRequestError tự nhiên
  integrations: [
    Sentry.pinoIntegration({
      error: { levels: [] },
      log: { levels: ["info", "warn", "error"] },
    }),
  ],
});
```

---

## 3. File Changes

### Tạo mới

| File | Nội dung |
|---|---|
| `src/lib/errors/base.error.ts` | AppError (base, isOperational) |
| `src/lib/errors/not-found.error.ts` | NotFoundError |
| `src/lib/errors/unauthorized.error.ts` | UnauthorizedError |
| `src/lib/errors/validation.error.ts` | ValidationError |
| `src/lib/errors/conflict.error.ts` | ConflictError |
| `src/lib/errors/index.ts` | barrel: re-export all |
| `src/lib/http/with-route.ts` | Route wrapper |
| `src/features/passage/errors/passage-not-found.error.ts` | ArtifactNotFoundError |
| `src/features/passage/errors/passage-service.error.ts` | PassageStudyServiceError |
| `src/features/ai-chat/errors/chat-service.error.ts` | StudyChatServiceError |
| `src/features/vocabulary/errors/vocabulary-service.error.ts` | VocabularyServiceError |
| `src/features/upload/errors/upload-workflow.error.ts` | UploadWorkflowError (bỏ status) |

### Sửa

| File | Thay đổi |
|---|---|
| `src/lib/http/route-error-handler.ts` | Fix import ApiErrorResponse, remove dead errorCode, thêm UnauthorizedError/ValidationError/ConflictError mapping |
| `src/app/api/translate/route.ts` | Dùng withRoute, happy path only |
| `src/app/api/studio/chat/route.ts` | Đổi StudyChatServiceError check → NotFoundError, keep streaming try/catch |
| `src/features/ai-chat/services/chat-service.ts` | Đổi `throw StudyChatServiceError("Passage not found.")` → `NotFoundError("Passage")` |
| `src/sentry.server.config.ts` | Xóa prismaIntegration |

### Xóa

| File | Lý do |
|---|---|
| `src/lib/http/route-errors.ts` | orphan (đã thay bằng route-error-handler.ts) |
| `src/lib/http/api-response.schema.ts` | orphan (đã thay bằng api-envelope-schema.ts) |

### Migrate imports

| File | Từ | Sang |
|---|---|---|
| `vocabulary-items.repository.ts` | `@/lib/http/route-errors-` | `@/lib/errors` |
| `vocabulary-item-progress.repository.ts` | `@/lib/http/route-errors-` | `@/lib/errors` |
| `vocabulary-sets.repository.ts` | `@/lib/http/route-errors-` | `@/lib/errors` |
| `passage-study.service.ts` | `@/lib/http/route-error-handler` | `@/lib/errors` |
| `studio-artifacts.service.ts` | `@/lib/http/route-error-handler` | `@/features/passage/errors` |

---

## 4. Acceptance Criteria

1. Không file nào trong `lib/errors/` import từ `lib/http/` hoặc `@sentry/nextjs`
2. Route chỉ gọi `withRoute()` hoặc `toHttp()` — không có try/catch thủ công cho non-streaming routes
3. Service/Repository chỉ throw, không gọi bất cứ thứ gì trong `lib/http/`
4. toHttp chỉ match 4 base classes + fallback 500 — không có instanceof FeatureError
5. Prisma query không xuất hiện trong Sentry dashboard (noise = 0)
6. 500 errors vẫn được capture (không regression)
7. Streaming route không crash khi pre-stream error xảy ra

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| Feature errors (StudyChatServiceError) không có mapping → thành 500 | Document: muốn map → extend base class hoặc dùng NotFoundError |
| UploadWorkflowError có status field → layer violation | Đã bỏ status field, toHttp map bằng base class |

---

## 6. Next Steps

1. Tạo `src/lib/errors/` structure + base classes
2. Migrate existing error definitions
3. Update all import sites
4. Create `withRoute` wrapper
5. Refactor non-streaming routes
6. Remove `prismaIntegration`
7. Delete orphans
8. Verify — run tests + typecheck
