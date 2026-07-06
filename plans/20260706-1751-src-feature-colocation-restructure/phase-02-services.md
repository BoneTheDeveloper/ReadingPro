---
phase: 2
title: "Foundation: services/"
status: pending
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 2: Foundation: services/

## Overview

Tạo `src/services/` cho code cross-cutting dùng bởi nhiều feature: Clerk auth helper, AI client, blob storage, logger. Đây là phase rủi ro cao nhất trong foundation vì `logger.ts` bị 33 file import — bắt buộc dùng re-export tạm.

## Requirements

- Functional: `services/clerk.ts`, `services/ai/`, `services/storage.ts`, `services/logger.ts` tồn tại và hoạt động y hệt bản gốc
- Non-functional: KHÔNG được sửa tay 33 file import logger — giữ `server/observability/logger.ts` làm re-export trỏ sang `services/logger.ts` cho tới phase 12

## Architecture

- `src/services/clerk.ts` ← **chỉ** `src/server/auth/auth-utils.ts` (pure auth helpers: `getUserId`, `requireAuth`, `getPageUserId`, `AuthenticationRequiredError`). **KHÔNG gộp sync-user** — sync-user là DB-specific, đi Phase 10.
- `src/services/ai/` ← copy nguyên `src/server/ai/*` (prompt-utils.ts, question-generator.ts, content-simplifier.ts)
- `src/services/storage.ts` ← `src/server/storage/blob-storage.ts`
- `src/services/logger.ts` ← `src/server/observability/logger.ts`
- File gốc `server/auth/auth-utils.ts` → re-export từ `services/clerk`
- File gốc `server/auth/sync-user.ts` → **chưa đổi** (Phase 10 sẽ pick up)
- File gốc `server/ai/`, `server/storage/`, `server/observability/` → re-export

## Related Code Files

- Create: `src/services/clerk.ts`, `src/services/ai/*`, `src/services/storage.ts`, `src/services/logger.ts`
- Modify: `src/server/auth/auth-utils.ts` (re-export), `src/server/auth/sync-user.ts` (unchanged — Phase 10), `src/server/ai/*.ts` (re-export), `src/server/storage/blob-storage.ts` (re-export), `src/server/observability/logger.ts` (re-export)

## Implementation Steps

1. Đọc từng file nguồn (`server/auth/auth-utils.ts`, `server/auth/sync-user.ts`, `server/ai/*.ts`, `server/storage/blob-storage.ts`, `server/observability/logger.ts`)
2. Tạo file tương ứng trong `services/` với nội dung y hệt (sửa import nội bộ nếu file này gọi lẫn nhau)
3. Thay nội dung file gốc bằng re-export
4. Grep xác nhận 33 chỗ dùng `observability/logger` vẫn resolve được qua re-export (không cần sửa các file đó ở phase này)
5. Chạy `pnpm run typecheck && pnpm run lint`

## Success Criteria

- [ ] `services/clerk.ts` chỉ chứa auth-utils (0 Prisma imports); `services/auth/` hoặc `sync-user` chưa đụng ở Phase 2
- [ ] `services/ai/*`, `services/storage.ts`, `services/logger.ts` tồn tại, nội dung đúng
- [ ] `grep "export.*AuthenticationRequiredError" src/services/clerk.ts` → tìm thấy (Phase 3 cần)
- [ ] File gốc trong `server/auth/auth-utils.ts` → re-export; `server/auth/sync-user.ts` → unchanged; `server/ai`, `server/storage`, `server/observability` → re-export
- [ ] `pnpm run typecheck` pass — 33 import logger cũ không vỡ
- [ ] `pnpm run lint` pass

## Risk Assessment

Rủi ro cao nhất trong nhóm foundation do `logger.ts` có 33 consumer. Mitigation: bắt buộc re-export, không đổi 33 file import ngay — chỉ đổi khi phase feature liên quan tới file đó chạy tới. Auth split: `auth-utils.ts` (0 Prisma) → `services/clerk.ts`, `sync-user.ts` (6 Prisma) → để nguyên (`Phase 10` pick up). Rollback: revert re-export về nội dung gốc.
