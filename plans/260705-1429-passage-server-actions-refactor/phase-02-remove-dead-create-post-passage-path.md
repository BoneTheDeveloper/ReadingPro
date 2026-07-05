---
phase: 2
title: "Remove dead create/POST passage path"
status: pending
priority: P2
effort: "1h"
dependencies: [1]
---

# Phase 2: Remove dead create/POST passage path

## Overview

Gỡ đường tạo passage trùng lặp/đang hỏng: `POST /api/passages` + `createPassageRecord` + `createPassage` client (gọi `/api/study/passages` → 404). Trỏ luồng text/paste của `upload-modal` sang route thật `/api/upload/text`. Sau phase này, `passages-client.ts` chỉ còn `deletePassage` → dọn nốt ở Phase 3.

## Requirements
- Functional: thêm nguồn bằng dán text trong `upload-modal` hoạt động thật qua `/api/upload/text` (có AI analysis, nhất quán với upload page).
- Non-functional: không còn tham chiếu `/api/study/passages` (404) trong codebase.

## Architecture

Hiện có 2 đường text: (a) `upload-modal.createPassage` → `/api/study/passages` (404, không AI) và (b) `upload-page.uploadText` → `/api/upload/text` (thật, AI). Hợp nhất về (b). `upload-modal` dùng lại `uploadText` từ `features/source-panel/api-client/upload-client.ts`. Kết quả trả về map sang `PassageData` để `onUploadComplete` (Phase 3 sẽ đổi sang optimistic + `router.refresh()`).

## Related Code Files
- Delete: `app/api/passages/route.ts` (POST create) — xoá cả file nếu không còn method khác (chỉ có POST)
- Delete: `server/modules/upload/passage-create/passage-create.service.ts` (`createPassageRecord`) — verify chỉ POST route dùng
- Modify: `contracts/study/passage-schema.ts` — gỡ `createPassageRequestSchema`, type `CreatePassageRequest`, và `passageResponseSchema` (chỉ `createPassage` dead dùng); giữ `passageSchema`/`PassageDto` nếu còn consumer khác (grep)
- Modify: `features/source-panel/ui/upload-modal.tsx` — bỏ import/dùng `createPassage`; nhánh text dùng `uploadText` (từ `upload-client.ts`); map kết quả → `onUploadComplete`
- Modify: `features/content-panel/api-client/passages-client.ts` — gỡ `createPassage` + import schema create (giờ file chỉ còn `deletePassage`)

## Implementation Steps
1. Grep: `rg -rn "createPassageRecord|createPassage\b|/api/study/passages|passageResponseSchema|CreatePassageRequest" app/ features/ server/ contracts/` → liệt kê hết.
2. Xác nhận `createPassageRecord` chỉ `app/api/passages/route.ts` dùng → xoá `passage-create.service.ts` + route file.
3. Xác nhận `passageResponseSchema`/`PassageDto` không còn consumer ngoài dead-path; gỡ tương ứng (giữ `passageSchema` nếu `PassageDto` còn dùng nơi khác).
4. `upload-modal.tsx`: thay `createPassage({...})` bằng `uploadText(text)` (hoặc `uploadFile` cho nhánh file nếu modal có). Đảm bảo shape trả về đủ cho `onUploadComplete` (id, title, content, levels, wordCount, createdAt, sourceType) — nếu `uploadText` trả thiếu, dùng kết quả rồi để Phase 3 `router.refresh()` kéo bản đầy đủ từ RSC.
5. `passages-client.ts`: gỡ `createPassage` + import schema create.
6. `pnpm typecheck` → sửa lỗi.

## Success Criteria
- [ ] `rg -rn "/api/study/passages" .` → 0 kết quả.
- [ ] `rg -rn "createPassage" features/ app/` → 0 (chỉ còn upload path).
- [ ] Dán text trong upload-modal đi qua `/api/upload/text`.
- [ ] `pnpm typecheck` sạch.

## Risk Assessment
- **`uploadText` trả shape khác `createPassage`** → `onUploadComplete` thiếu field. Mitigation: Phase 3 chuyển `onUploadComplete` sang optimistic + `router.refresh()` nên chỉ cần `passageId`; tạm thời map field có sẵn.
- **`passageSchema`/`PassageDto` còn consumer ẩn** → xoá nhầm. Mitigation: grep trước khi gỡ; chỉ gỡ `passageResponseSchema` (wrapper) nếu chắc.
- **Modal có nhánh file dùng createPassage** → cần trỏ `/api/upload`. Mitigation: đọc kỹ `upload-modal.tsx`, xử lý cả 2 nhánh.
