---
phase: 4
title: "Verify typecheck lint test"
status: completed
priority: P2
effort: "1h"
dependencies: [3]
---

# Phase 4: Verify typecheck lint test

## Overview

Kiểm tra toàn bộ refactor: typecheck, lint, test; cập nhật/gỡ test liên quan simplify & create-passage; dọn tham chiếu chết còn sót; cập nhật docs nếu behavior/API đổi.

## Requirements
- Functional: build + test pass; không còn tham chiếu tới route/schema/hàm đã xoá.
- Non-functional: không có test giả/mock để né lỗi (tuân development-rules).

## Related Code Files
- Modify/Delete: test liên quan `simplify`, `createPassage`, `/api/passages`, `passages-client` (tìm trong `tests/`)
- Modify: `docs/` nếu API passage/upload behavior đổi (dev-guide, codebase-summary, API docs)
- Grep sweep toàn repo cho tên đã xoá

## Implementation Steps
1. `rg -rn "simplifyPassage|createPassage|/api/study/passages|/api/passages|passages-client|simplifyPassageForUser|createPassageRecord" .` → chỉ còn (a) `deletePassageAction`, (b) route upload, (c) `simplifiedContent/simplifiedLevel`. Không còn tham chiếu chết.
2. Tìm test đụng simplify/create: `rg -rln "simplif|createPassage|passages-client" tests/` → cập nhật hoặc xoá test không còn hợp lệ; thêm test cho `deletePassageAction` nếu có hạ tầng test action.
3. `pnpm typecheck`.
4. `pnpm lint`.
5. `pnpm test`.
6. Smoke thủ công (dev): upload file + text → xuất hiện trong sources; xoá passage đang mở → active nhảy sang cái mới nhất; xoá hết → empty state.
7. Cập nhật `docs/` nếu cần (route bị xoá, thêm server action).

## Success Criteria
- [ ] `pnpm typecheck` sạch.
- [ ] `pnpm lint` sạch.
- [ ] `pnpm test` pass (không skip/mock né lỗi).
- [ ] Grep sweep: 0 tham chiếu chết.
- [ ] Smoke: upload / delete / reconcile active hoạt động.
- [ ] Docs cập nhật nếu behavior/API đổi.

## Risk Assessment
- **Test cũ giả định route/simplify tồn tại** → fail. Mitigation: cập nhật theo hành vi mới, không xoá bừa để pass.
- **Server action khó test trong vitest** → có thể test lớp `deletePassage` (db query) + tách logic action mỏng. Mitigation: giữ action mỏng, test tại tầng query đã có.

## Execution Notes (as implemented) — important deviations

- **`pnpm test` KHÔNG chạy được — không phải do refactor này.** Phát hiện: `tests/vitest/vitest.config.ts` không tồn tại trong repo, và **không có bất kỳ file test nào** được track trong git (`git ls-files | grep -i test` → rỗng). Hạ tầng test chưa từng được dựng, hoặc đã bị xoá từ trước — xác nhận qua `git stash` baseline (lỗi y hệt trước khi tôi sửa gì). Dựng test suite từ đầu nằm ngoài phạm vi "action-only" đã chốt với user → KHÔNG tự ý làm, báo cáo lại thay vì che giấu hoặc fake pass.
- `pnpm typecheck`: sạch cho mọi touchpoint của refactor. 15 lỗi còn lại là pre-existing (verify bằng `git stash` baseline), toàn bộ ở module ngoài phạm vi (studio-panel, learning-session, translation `@/server/ai/translator`, `@/features/study/shared/api-utils`) — không liên quan passage/upload/source-panel/content-panel.
- `pnpm lint`: 0 error, 7 warning — toàn bộ warning pre-existing ở module vocabulary/dictionary, không liên quan.
- Grep sweep: xác nhận 0 tham chiếu tới `simplifyPassage`, `createPassageRecord`, `passage-create.service`, `passages-client`, `/api/study/passages`, `passage-schema.ts` trên toàn repo (trừ thư mục `plans/`).
- **KHÔNG smoke-test được qua UI thật** — dev server yêu cầu đăng nhập Clerk, user yêu cầu dừng ngay khi thấy tôi chuẩn bị chụp màn hình/truy cập trang cần auth. Đã khởi động + dừng server đúng lúc theo yêu cầu. Đây là giới hạn thật, không phải đã verify — user cần tự kiểm tra luồng upload/delete/reconcile active khi đăng nhập được.
- Docs: đã đồng bộ qua `docs-manager` subagent — xoá `docs/API/Routes/study/passages.md` (obsolete), cập nhật `api-index.md`, `study/README.md`, `Flows/user-flows/{README,study-passage}.md`, `Flows/data-flows/study-flow.md`, `Design/pages-design/study-page.md`. Verify lại bằng grep: các mention "simplif" còn lại trong docs đều mô tả auto-simplify-khi-upload (không đổi) và toggle Original/Simplified (không đổi) — chính xác.
