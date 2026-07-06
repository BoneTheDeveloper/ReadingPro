---
phase: 14
title: "Cleanup old dirs"
status: pending
priority: P2
effort: "2h"
dependencies: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
---

# Phase 14: Cleanup old dirs

## Overview

Phase cuối — xoá toàn bộ re-export tạm còn sót (từ phase 1-3), xác nhận `contracts/`, `server/` cũ đã trống hoàn toàn, cập nhật docs (`docs/codebase-summary.md`, `docs/code-standards.md`) phản ánh cấu trúc mới, chạy full verify suite.

## Requirements

- Functional: app chạy đúng như trước restructure (không regression)
- Non-functional: `src/contracts/`, `src/server/` không còn tồn tại (trừ khi có phần cố ý giữ lại — ghi rõ lý do nếu có); `docs/codebase-summary.md` mô tả đúng cấu trúc `features/{name}/{components,actions,db,schemas,hooks}` mới

## Architecture

Không có kiến trúc mới ở phase này — đây là bước dọn dẹp + verify + đồng bộ docs.

## Related Code Files

- Modify: `docs/codebase-summary.md`, `docs/code-standards.md` (cập nhật theo cấu trúc mới)
- Delete: `src/contracts/` (toàn bộ, nếu trống), `src/server/` (toàn bộ, nếu trống — trừ `server/http/route-errors.ts` nếu vẫn cần dùng chung cho route handlers, xác nhận lại lúc này)

## Implementation Steps

1. **Per-phase re-export verification** (run after each of phases 4-13, not just here): sau mỗi phase, grep OLD_PATH imports còn lại trong scope của phase đó — phải = 0. Nếu >0 → phase đó chưa xong, không qua phase tiếp.
2. **Final cleanup checks (Phase 14):**
   a. `grep -rn "@/contracts/" src/ --include="*.ts" --include="*.tsx"` → 0 results
   b. `grep -rn "@/server/" src/ --include="*.ts" --include="*.tsx"` → 0 results (trừ phần cố ý giữ)
   c. `grep -rn "src/contracts/" src/ --include="*.ts" --include="*.tsx"` → directory existence check (old dirs must be gone from disk)
   d. `grep -rn "src/server/" src/ --include="*.ts" --include="*.tsx"` → directory existence check
   e. Grep `prisma.passage` — chỉ được xuất hiện trong `features/passage/db/`
3. **Dynamic import check:** grep `import(` trong src/ → không có dynamic import trỏ `@/contracts/*` hoặc `@/server/*`
4. **Full test suite:** `pnpm run test` phải pass trước bước delete
5. Xoá `src/contracts/`, `src/server/` (trừ phần cố ý giữ nếu có)
6. Cập nhật `docs/codebase-summary.md` + `docs/code-standards.md`
7. `pnpm run typecheck && pnpm run lint && pnpm run test` — tất cả pass
8. Test thủ công toàn bộ luồng chính 1 lần cuối

## Success Criteria

- [ ] Per-phase re-export verification đã chạy sau mỗi phase 4-13, không có phase nào có OLD_PATH imports > 0
- [ ] Final cleanup: `grep "@/contracts/"` = 0, `grep "@/server/"` = 0 (trừ phần giữ lại)
- [ ] Directory existence: `src/contracts/` và `src/server/` không còn tồn tại trên disk
- [ ] `prisma.passage` chỉ trong `features/passage/db/`
- [ ] Dynamic import check: 0 results cho `@/contracts/*` hoặc `@/server/*` trong `import(`
- [ ] `pnpm run test` pass trước khi delete
- [ ] `src/contracts/`, `src/server/` không còn tồn tại
- [ ] `docs/codebase-summary.md`, `docs/code-standards.md` phản ánh đúng cấu trúc mới
- [ ] `pnpm run typecheck && pnpm run lint && pnpm run test` đều pass
- [ ] Test thủ công full flow lần cuối không lỗi

## Risk Assessment

Rủi ro thấp nếu phase 1-11 đã verify từng bước — đây chủ yếu là dọn dẹp + đồng bộ docs. Rủi ro chính: sót import cũ do re-export tạm che giấu lỗi suốt các phase trước — **Per-phase re-export verification** (Implementation Step 1) là bắt buộc, không được bỏ qua. Nếu Step 1 phát hiện >0 → quay lại phase chưa xong, không tiếp tục.
