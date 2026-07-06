---
phase: 8
title: "Passage entity"
status: pending
priority: P1
effort: "3h"
dependencies: [1, 2, 3]
---

# Phase 8: Passage entity

## Overview

Tạo `features/passage/` — nguồn chân lý DUY NHẤT cho entity Passage (hiện `prisma.passage` bị đụng từ 5 file rải 4 chỗ: passage-queries, content-analysis.repository, passage-study.repository, chat-service, translation-queries). Feature này chứa CRUD + ownership check + types + UI danh sách passage. Các feature khác (upload, reading, studio) import từ đây, KHÔNG tự query `prisma.passage` nữa.

## Requirements

- Functional: danh sách passage (sources-panel), xoá passage, ownership check hoạt động y hệt
- Non-functional: sau toàn bộ plan, `prisma.passage` chỉ được gọi từ `features/passage/db/` (grep verify ở phase 14). Ở phase này chỉ cần passage feature hoàn chỉnh + các consumer hiện tại vẫn chạy qua re-export tạm

## Architecture

```
features/passage/
├── components/    ← sources-panel.tsx (từ features/source-panel/ui/ — UI danh sách passage, KHÔNG phải upload UI)
├── actions/        ← delete-passage.ts (tách deletePassageAction từ features/study-workspace/actions.ts)
├── db/
│   └── passage-queries.ts   ← getUserPassages, getUserPassageOverview, getPassageWithQuestions, deletePassage, findOwnedPassage (gom cả ownership check từ passage-study.repository + getOwnedTranslationSource)
│   └── passage-write.ts     ← createPassage, updatePassageAnalysis (tách từ content-analysis.repository.ts — dùng bởi Phase 9 Upload)
└── schemas/        ← passage-types.ts (PassageData, StudyStatus, SourceType, DocumentItem — tách từ features/study/shared/types.ts)
```

**Ownership check hợp nhất:** hiện có 3 bản check "passage này thuộc user này không":
1. `chat-service.ts` selects `{ id: true, content: true, title: true }`
2. `translation-queries.getOwnedTranslationSource` selects `{ id: true, title: true }`
3. `passage-study.repository` uses full passage (no select)

Gom về 1 hàm `findOwnedPassage(userId, passageId, select?)` với optional select param — verify 3 call sites trước khi hợp nhất, đảm bảo mỗi caller nhận đúng fields. Nếu select shapes khác nhau quá nhiều → giữ 2 hàm riêng (`findOwnedPassage` + `getPassageForChat`).

**Dead code xoá luôn:** `getNewCards` trong passage-queries.ts (0 consumer).

**Lưu ý phân loại:** `questionOptionSchema`, `questionDataSchema`, `createQuestion` trong passage-queries.ts thuộc về **studio** (quiz), KHÔNG đưa vào passage feature — để lại re-export chờ phase 12 nhặt.

## Related Code Files

- Create: `features/passage/components/sources-panel.tsx`, `features/passage/actions/delete-passage.ts`, `features/passage/db/passage-queries.ts`, `features/passage/db/passage-write.ts`, `features/passage/schemas/passage-types.ts`
- Modify: `server/db/passage-queries.ts` (re-export passage phần, giữ phần question chờ phase 12), `features/study-workspace/actions.ts` (bỏ deletePassageAction, re-export tạm), `app/[locale]/(dashboard)/study/page.tsx` (đổi import), `features/study/shared/types.ts` (re-export passage types)
- Delete: hàm `getNewCards` (dead code — grep verify trước khi xoá)

## Implementation Steps

1. Đọc `server/db/passage-queries.ts`, `server/modules/passage/passage-study.repository.ts`, `server/db/translation-queries.ts`, `server/modules/upload/content-analysis/content-analysis.repository.ts`, `server/modules/ai-chat/chat-service.ts`, `features/study/shared/types.ts`, `features/source-panel/ui/sources-panel.tsx`, `features/study-workspace/actions.ts`
2. **Verify 3 ownership call sites** trước khi hợp nhất: grep `prisma.passage.findUnique` trong `chat-service.ts`, `translation-queries.ts`, `passage-study.repository.ts` — xác nhận select fields mỗi caller cần
3. Tạo `features/passage/schemas/passage-types.ts`; `features/study/shared/types.ts` re-export từ đây
4. Tạo `features/passage/db/passage-queries.ts`: getUserPassages, getUserPassageOverview, getPassageWithQuestions, deletePassage, findOwnedPassage (hợp nhất ownership theo step 2), XOÁ getNewCards (grep verify = 0 consumers trước khi xoá)
5. Tạo `features/passage/db/passage-write.ts`: createPassage, updatePassageAnalysis — tách logic ghi passage từ `content-analysis.repository.ts`; Phase 9 sẽ import từ đây
6. `server/db/passage-queries.ts` → re-export passage queries + passage-write (giữ phần question chờ phase 12)
7. Tạo `features/passage/actions/delete-passage.ts` ("use server"); workspace actions re-export tạm
8. Di chuyển `sources-panel.tsx` vào `features/passage/components/`, sửa import trong `study-workspace-client.tsx`
9. Sửa `study/page.tsx` import trực tiếp từ `features/passage`
10. `pnpm run typecheck && pnpm run lint`
11. Test thủ công: trang study hiển thị danh sách passage, xoá passage hoạt động

## Success Criteria

- [ ] `features/passage/` hoàn chỉnh với 5 nhóm (components/actions/db/schemas + passage-write.ts)
- [ ] `getNewCards` đã xoá (grep verify = 0 consumers trước xoá)
- [ ] Ownership check: 3 call sites (`chat-service`, `translation-queries`, `passage-study`) đã verify select fields trước khi hợp nhất
- [ ] `createPassage`/`updatePassageAnalysis` trong `passage-write.ts` — Phase 9 sẽ import từ đây
- [ ] `study/page.tsx` và `study-workspace-client.tsx` import từ `features/passage`
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] Danh sách + xoá passage hoạt động đúng khi test thủ công

## Risk Assessment

Rủi ro trung bình — passage là entity trung tâm, nhiều consumer. Mitigation: re-export tạm ở mọi vị trí cũ, consumer chỉ đổi dần theo phase của chúng (upload phase 9, reading phase 11, studio phase 12); hợp nhất ownership check phải so sánh kỹ `select` fields của từng bản trước khi gom.
