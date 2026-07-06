---
phase: 5
title: "Learning-session feature + event-driven trigger refactor"
status: pending
priority: P1
effort: "3h"
dependencies: [1, 2, 3]
---

# Phase 5: Learning-session feature + event-driven trigger refactor

## Overview

Hai việc: (1) migrate learning-session sang cấu trúc feature-colocation; (2) REFACTOR mô hình trigger heartbeat — hiện đang nhét trong `DashboardSidebar` với timer 60s mù, đổi sang event-driven throttled, mount ở tầng layout. Scope GIỮ app-wide (cả app là để học, `learning-session` = thời gian dùng app — KHÔNG thu hẹp về reading). Vấn đề cần sửa: coupling vào component sidebar (thiếu tự nhiên) + timer chạy bất kể tương tác (mở tab bỏ đi vẫn đếm vì ping 60s reset cutoff idle server).

## Requirements

- Functional: `/api/learning-session` giữ nguyên; session vẫn được tạo/giữ-sống khi user thực sự dùng app; server vẫn tự đóng session idle >10 phút (cutoff `SESSION_IDLE_MS` sẵn có)
- Non-functional:
  - Heartbeat KHÔNG còn nằm trong `DashboardSidebar` — tách ra client component riêng, mount 1 lần ở `(dashboard)/layout.tsx`
  - Trigger buộc vào **sự kiện tương tác thật**, không vào lifecycle/rerender/timer mù
  - Idle (không tương tác) → ngừng ping → server đóng session; quay lại tương tác → ping tiếp

## Architecture

```
features/learning-session/
├── ui/
│   └── learning-session-tracker.tsx   ← client component render null; mount activity reporter
├── hooks/
│   └── use-learning-session-tracker.ts ← event-driven throttled logic (thay use-learning-session-heartbeat.ts)
├── db/             ← learning-session-queries.ts (ensureActiveSession... — từ server/db/)
├── schemas/        ← learning-session-response-schema.ts (từ contracts/learning-session/)
└── learning-session-client.ts          ← ensureStudySession() fetch wrapper (giữ, sửa import schema)
```

**Mô hình trigger mới (`use-learning-session-tracker`):**
- Ping 1 lần khi mount (app mở).
- Đăng ký listener cho sự kiện định sẵn: `mousedown`, `keydown`, `scroll` (passive), `touchstart` (passive, iOS Safari momentum fallback), `visibilitychange` (khi →visible), đổi route (theo dõi `usePathname`).
- Throttle: giữ `lastPingAt` (ref/module var); mỗi sự kiện chỉ ping nếu `now - lastPingAt >= 60_000` VÀ `document.visibilityState === "visible"`.
- KHÔNG dùng `setInterval` mù. Không event → không ping.
- Cleanup gỡ hết listener khi unmount.

**Mount point:** `(dashboard)/layout.tsx` (server component) render `<LearningSessionTracker />` cạnh `<DashboardSidebar>`. Gỡ `useStudySessionHeartbeat(true)` khỏi `dashboard-sidebar.tsx`.

## Related Code Files

- Create: `features/learning-session/ui/learning-session-tracker.tsx`, `features/learning-session/hooks/use-learning-session-tracker.ts`, `features/learning-session/db/learning-session-queries.ts`, `features/learning-session/schemas/learning-session-response-schema.ts`
- Modify: `app/[locale]/(dashboard)/layout.tsx` (render tracker), `components/layout/dashboard-sidebar.tsx` (gỡ import + call heartbeat), `app/api/learning-session/route.ts` (đổi import db + schema), `features/learning-session/learning-session-client.ts` (đổi import schema)
- Delete: `features/learning-session/use-learning-session-heartbeat.ts` (thay bằng hook mới), `contracts/learning-session/`, `server/db/learning-session-queries.ts`

## Implementation Steps

1. Grep xác nhận consumer của `learning-session-queries.ts`, `contracts/learning-session/*`, `use-learning-session-heartbeat` — chỉ sidebar + route + client (đã biết)
2. Chuyển db + schema vào feature; sửa `learning-session-client.ts` + route trỏ import mới
3. Viết `use-learning-session-tracker.ts` theo mô hình event-driven throttled ở trên
4. Viết `learning-session-tracker.tsx` (`"use client"`, render `null`, gọi hook)
5. Sửa `(dashboard)/layout.tsx` render `<LearningSessionTracker />`; gỡ heartbeat khỏi `dashboard-sidebar.tsx`
6. Xoá `use-learning-session-heartbeat.ts`, `contracts/learning-session/`, `server/db/learning-session-queries.ts`
7. `pnpm run typecheck && pnpm run lint`
8. Test thủ công (network tab): mở app → thấy 1 ping; click chuột liên tục <60s → KHÔNG ping thêm (throttle); tương tác sau >60s → ping; để yên không tương tác vài phút → không có ping nào; chuyển tab đi rồi về → ping khi visible; đổi route → ping (nếu quá throttle); iOS Safari → scroll momentum → `touchstart` fires đúng

## Success Criteria

- [ ] `features/learning-session/` theo cấu trúc mới; `contracts/learning-session/`, `server/db/learning-session-queries.ts` đã xoá
- [ ] `dashboard-sidebar.tsx` KHÔNG còn import/call learning-session; tracker mount ở layout
- [ ] Không còn `setInterval` mù — ping chỉ theo sự kiện định sẵn + throttle 60s
- [ ] Để yên không tương tác → không ping (verify network tab); tương tác → ping đúng throttle
- [ ] `pnpm run typecheck && pnpm run lint` pass

## Risk Assessment

Rủi ro trung bình — đây là behavioral change, không chỉ move file. Rủi ro chính: (a) bỏ sót sự kiện khiến session đóng oan khi user vẫn đang đọc (mitigate: `scroll` + `mousedown` + `touchstart` + `keydown` phủ hầu hết tương tác đọc desktop + mobile; server cutoff 10 phút đủ rộng); (b) throttle sai khiến spam hoặc bỏ ping (test kỹ network tab theo các mốc thời gian). Verify bằng quan sát network thực tế, không chỉ typecheck.
