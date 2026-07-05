---
phase: 5
title: Cleanup and Verify
status: completed
effort: ''
---

# Phase 5: Cleanup and Verify

## Overview

Quét toàn bộ để đảm bảo không còn dead import/orphaned file, xác nhận danh sách route API còn lại đúng như quy tắc đã chốt (chỉ route có AI/external-service), verify cuối bằng typecheck+lint, cập nhật docs nếu có thay đổi kiến trúc đáng ghi nhận.

## Related Code Files
- Không tạo file mới; chỉ audit + dọn dẹp phát sinh (nếu có) trong các file đã sửa ở Phase 1-4

## Implementation Steps

1. Grep xác nhận route API còn lại dưới `app/api/studio/**`, `app/api/upload/**`, `app/api/translate`, `app/api/vocabulary/**` khớp đúng bảng phân loại trong `brainstorm-summary.md`: chỉ còn `POST /api/upload`, `POST /api/upload/text`, `POST /api/studio/questions`, `POST /api/studio/chat`, `POST /api/translate`, `POST /api/vocabulary` (giữ vì dictionary dùng chung).
2. Grep toàn repo tìm import chết: `studio-artifacts-client`, `STUDY_API_ROUTES` (đã xử lý ở phiên trước, xác nhận không tái phát), route path string cũ (`/api/studio/artifacts`, `/api/studio/chat?passageId`) không còn trong bất kỳ `fetch(...)` client nào ngoài phạm vi cố ý giữ.
3. Xác nhận `features/studio-panel/actions.ts` và `features/study-workspace/actions.ts` đều có `'use server'` ở dòng đầu file, không export gì khác ngoài async function.
4. Chạy `pnpm run typecheck && pnpm run lint` — so sánh baseline: phải bằng hoặc ít lỗi hơn baseline trước phase 1 (baseline: chỉ còn lỗi tiền tồn tại ở `@/server/ai/translator`, không liên quan phạm vi này).
5. Cập nhật `docs/system-architecture.md` (nếu tồn tại) ghi nhận quy ước mới: "route không AI/external-service → Server Action; route có AI/external-service → Route API" — chỉ update nếu doc này có mục liên quan đến study page API, không tạo mục mới nếu không cần thiết.

## Success Criteria

- [ ] Route API còn lại dưới study page cluster đúng 6 route liệt kê ở bước 1, không thừa không thiếu
- [ ] Không còn dead import nào liên quan đến các route/file đã xoá ở Phase 2-3
- [ ] `pnpm typecheck && pnpm lint` sạch, không tệ hơn baseline
- [ ] Docs cập nhật nếu có thay đổi kiến trúc đáng ghi nhận (tuỳ tình huống thực tế lúc chạy)

## Risk Assessment
Thấp — đây là phase soát lại, không thêm logic mới. Rủi ro duy nhất là bỏ sót 1 consumer cũ chưa sửa hết ở phase trước — bước 2 (grep quét toàn repo) là chốt chặn cuối.
