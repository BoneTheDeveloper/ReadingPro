---
phase: 4
title: "Verify typecheck lint test"
status: pending
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
