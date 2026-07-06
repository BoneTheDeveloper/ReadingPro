---
phase: 4
title: "Progress feature"
status: pending
priority: P2
effort: "2h"
dependencies: [1, 2, 3]
---

# Phase 4: Progress feature

## Overview

Feature đơn giản nhất, migrate đầu tiên để làm mẫu pattern cho các phase sau. Gộp `features/progress/*`, `server/db/quiz/quiz-review.ts` (nguồn dữ liệu thật của progress stats — ĐÍNH CHÍNH so với report ban đầu: route `/api/progress/stats` import `getUserProgress` từ file này, KHÔNG dùng `passage-queries.ts`; passage-queries thuộc phase 8 Passage entity), `app/api/progress/*` vào `features/progress/{components,db,hooks}`.

## Requirements

- Functional: `/api/progress/stats` hoạt động y hệt, UI progress dashboard không đổi hành vi, landing page (`app/[locale]/page.tsx` cũng dùng `getUserProgress`) không vỡ
- Non-functional: giữ route `app/api/progress/stats/route.ts` (route đơn giản, không cần force đổi sang Server Action)

## Architecture

```
features/progress/
├── components/   ← progress-dashboard.tsx (từ features/progress/*)
├── db/            ← progress-queries.ts (từ server/db/quiz/quiz-review.ts: getUserProgress, STREAK_MIN_DAILY_MS)
└── hooks/         ← nếu progress-client.ts có phần hook, tách vào đây
```
2 consumer của `quiz-review.ts`: `app/api/progress/stats/route.ts` và `app/[locale]/page.tsx` — cả 2 sửa import trỏ `features/progress/db/`.

## Related Code Files

- Create: `src/features/progress/db/progress-queries.ts`, di chuyển `components/`, `hooks/` tương ứng
- Modify: `src/app/api/progress/stats/route.ts`, `src/app/[locale]/page.tsx` (đổi import)
- Delete: `src/server/db/quiz/quiz-review.ts` (sau khi 2 consumer đã trỏ chỗ mới; nếu thư mục `server/db/quiz/` trống thì xoá luôn)

## Implementation Steps

1. Đọc toàn bộ `features/progress/*` và `server/db/quiz/quiz-review.ts`
2. Tạo `features/progress/db/progress-queries.ts` (getUserProgress, STREAK_MIN_DAILY_MS), `components/`, `hooks/` theo nội dung đọc được
3. Sửa `app/api/progress/stats/route.ts` và `app/[locale]/page.tsx` trỏ import mới
4. Xoá `server/db/quiz/quiz-review.ts` và file cũ trong `features/progress/` gốc
5. `pnpm run typecheck && pnpm run lint`
6. Chạy dev server, mở landing page + trang progress dashboard, xác nhận số liệu hiển thị đúng

## Success Criteria

- [ ] `features/progress/` theo cấu trúc mới, `server/db/quiz/` đã xoá
- [ ] `/api/progress/stats` trả dữ liệu đúng, landing page hiển thị đúng
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] UI progress dashboard hiển thị đúng khi test thủ công

## Risk Assessment

Rủi ro thấp — feature nhỏ, 2 consumer rõ ràng. Lưu ý landing page cũng dùng getUserProgress, đừng bỏ sót khi sửa import.
