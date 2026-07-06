---
phase: 10
title: "Users feature"
status: pending
priority: P2
effort: "2h"
dependencies: [1, 2, 3]
---

# Phase 10: Users feature

## Overview

Tạo `features/users/` chứa sync-user logic từ Clerk webhook. Khác các feature khác — không có UI riêng, chủ yếu `db/` + webhook route. LƯU Ý: `services/clerk.ts` (phase 2) là pure auth helpers (auth-utils, 0 Prisma); feature `users/` này là phần đồng bộ user Clerk → DB (sync-user, 6 Prisma imports). Boundary rõ ràng: auth-helper → services/, DB-sync → features/users/.

## Requirements

- Functional: webhook `app/api/webhooks/clerk/route.ts` đồng bộ user đúng như trước
- Non-functional: route webhook GIỮ NGUYÊN là route (bắt buộc — webhook cần HTTP endpoint, không thể là Server Action)

## Architecture

```
features/users/
└── db/
    └── sync-user.ts   ← từ src/server/auth/sync-user.ts (syncUser, ensureUserProfile, deleteUserProfile, withUserProfile, isMissingUserProfileFk — tất cả đều đụng Prisma)
```
`services/clerk.ts` chỉ chứa auth helpers thuần (`getUserId`, `requireAuth`, `AuthenticationRequiredError`, `getPageUserId`) — không đụng Prisma. Phase 2 đã tách sạch, phase này chỉ pick up sync-user.

## Related Code Files

- Create: `src/features/users/db/sync-user.ts`
- Modify: `src/app/api/webhooks/clerk/route.ts` (đổi import), `src/services/clerk.ts` (nếu cần tách lại theo kiến trúc trên)

## Implementation Steps

1. Đọc `src/server/auth/sync-user.ts` — xác nhận 6 exports: `syncUser`, `ensureUserProfile`, `deleteUserProfile`, `withUserProfile`, `isMissingUserProfileFk`, `fkConstraintName`
2. Tạo `features/users/db/sync-user.ts` với nội dung y hệt; sửa internal import `@/server/lib/db` → `@/lib/prisma` (Phase 3)
3. Sửa `app/api/webhooks/clerk/route.ts` trỏ import `syncUser`/`deleteUserProfile` từ `@/features/users/db/sync-user`
4. `src/server/auth/sync-user.ts` → re-export từ `@/features/users/db/sync-user` (Phase 10 hoàn thành → Phase 14 xoá)
5. `pnpm run typecheck && pnpm run lint`
6. Test thủ công: trigger Clerk webhook xác nhận user sync đúng

## Success Criteria

- [ ] `features/users/db/sync-user.ts` tồn tại, ranh giới rõ với `services/clerk.ts`
- [ ] Webhook Clerk hoạt động đúng
- [ ] `pnpm run typecheck && pnpm run lint` pass

## Risk Assessment

Rủi ro thấp — 1 consumer duy nhất (webhook route). Rủi ro chính là raanh giới giữa `services/clerk.ts` và `features/users/db/` có thể mơ hồ nếu file gốc trộn lẫn 2 việc — cần đọc kỹ trước khi tách.
