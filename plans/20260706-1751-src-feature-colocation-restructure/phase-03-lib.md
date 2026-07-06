---
phase: 3
title: "Foundation: lib/"
status: pending
priority: P2
effort: "1h"
dependencies: [1, 2]
---

# Phase 3: Foundation: lib/

## Overview

Consolidate HTTP plumbing (HTTP transport, không domain) vào `lib/http/`. `lib/http/` hiện có `api-request.ts` — thêm `prisma.ts`, `route-errors.ts`, `response-schema.ts`. Mental model: "toàn bộ HTTP plumbing ở 1 chỗ". Tiền lệ có sẵn: `lib/prisma.ts` server-only nằm trong `lib/`.

## Requirements

- Functional:
  - `src/lib/prisma.ts` export prisma client singleton giống `server/lib/db.ts`
  - `src/lib/http/response-schema.ts` export envelope factory (`makeResponseSchema`, `apiErrorResponseSchema`, `success/performance`) giống `contracts/http/api-response-schema.ts`
  - `src/lib/http/route-errors.ts` export error classifiers (`isAuthenticationRequiredError`, `getZodErrorMessage`, `isOwnershipMissError`) giống `server/http/route-errors.ts`, import `AuthenticationRequiredError` từ `services/clerk`
- Non-functional: các import cũ (`@/server/lib/db`, `@/server/http/route-errors`, `@/contracts/http/api-response-schema`) không vỡ (re-export tạm)

## Architecture

- `src/lib/prisma.ts` ← copy `src/server/lib/db.ts`
- `src/lib/http/response-schema.ts` ← copy `src/contracts/http/api-response-schema.ts`
- `src/lib/http/route-errors.ts` ← copy `src/server/http/route-errors.ts`, đổi import `AuthenticationRequiredError` từ `@/server/auth/auth-utils` → `@/services/clerk` (services phase chạy trước lib phase nên path mới đã có)
- File gốc chuyển thành **re-export** tạm:
  - `src/server/lib/db.ts` → `export * from "@/lib/prisma"`
  - `src/contracts/http/api-response-schema.ts` → `export * from "@/lib/http/response-schema"`
  - `src/server/http/route-errors.ts` → `export * from "@/lib/http/route-errors"`
- `src/server/lib/model-config.ts` — kiểm tra consumer: nếu chỉ 1-2 feature dùng, để lại chờ migrate cùng feature đó (không bắt buộc phase này)

## Related Code Files

- Create: `src/lib/prisma.ts`, `src/lib/http/response-schema.ts`, `src/lib/http/route-errors.ts`
- Modify: `src/server/lib/db.ts` (re-export), `src/contracts/http/api-response-schema.ts` (re-export), `src/server/http/route-errors.ts` (re-export)

## Implementation Steps

1. Đọc `src/server/lib/db.ts`, `src/contracts/http/api-response-schema.ts`, `src/server/http/route-errors.ts`
2. `mkdir -p src/lib/http` (nếu chưa có)
3. Tạo `src/lib/prisma.ts` với nội dung y hệt `server/lib/db.ts`
4. Tạo `src/lib/http/response-schema.ts` với nội dung y hệt `contracts/http/api-response-schema.ts`
5. Tạo `src/lib/http/route-errors.ts` — copy từ `server/http/route-errors.ts`, đổi import `AuthenticationRequiredError` từ `@/server/auth/auth-utils` → `@/services/clerk`
6. **Pre-condition verify:** `grep "export.*AuthenticationRequiredError" src/services/clerk.ts` — phải tìm thấy export. Nếu không → Phase 2 chưa hoàn → block Phase 3.
7. Thay 3 file gốc bằng re-export duy nhất trỏ sang `lib/`:
   - `src/server/lib/db.ts` → `export * from "@/lib/prisma"`
   - `src/contracts/http/api-response-schema.ts` → `export * from "@/lib/http/response-schema"`
   - `src/server/http/route-errors.ts` → `export * from "@/lib/http/route-errors"`
8. Grep verify consumer của `server/modules/*` dùng `@/server/lib/db`, `@/server/http/route-errors`, `@/contracts/http/api-response-schema` — xác nhận vẫn resolve qua re-export
9. Chạy `pnpm run typecheck`

## Success Criteria

- [ ] `src/lib/prisma.ts` tồn tại, export đúng singleton
- [ ] `src/lib/http/response-schema.ts` export đúng envelope factory
- [ ] `src/lib/http/route-errors.ts` export đúng classifiers, import từ `services/clerk`
- [ ] 3 file gốc chỉ còn re-export
- [ ] `pnpm run typecheck` pass

## Risk Assessment

Rủi ro thấp-trung bình — Prisma singleton và HTTP plumbing dùng khắp nơi nhưng re-export đảm bảo không vỡ import. **Rủi ro chính:** `route-errors.ts` phụ thuộc `services/clerk` (phase 2) — phase 3 phải chạy SAU phase 2 hoàn thành. Rollback: revert re-export.
