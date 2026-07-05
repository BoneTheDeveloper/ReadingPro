---
phase: 1
title: "Remove simplify feature"
status: completed
priority: P2
effort: "1.5h"
dependencies: []
---

# Phase 1: Remove simplify feature

## Overview

Gỡ toàn bộ tính năng "simplify passage" (nút bấm on-demand): route, hàm service, schema, hook action, UI trong content-panel, và i18n key. Giữ trường `simplifiedContent/simplifiedLevel` trên passage (upload vẫn sinh ra) và `PassageStudyServiceError` / `generateQuestionsForPassage` (studio dùng).

## Requirements
- Functional: không còn nút/luồng simplify ở content-panel; không còn route `/api/passages/[id]/simplify`.
- Non-functional: `pnpm typecheck` sạch; studio questions (`generateQuestionsForPassage`) không bị ảnh hưởng.

## Architecture

Simplify chạy xuyên: `content-panel.tsx` (nút + modal + prop `simplifying`/`onSimplify`) → `use-study-actions.handleSimplify` → `passages-client.simplifyPassage` → `POST /api/passages/[id]/simplify` → `simplifyPassageForUser`. Gỡ từ trên xuống, giữ `passages-client.ts` (còn dùng ở Phase 2) — chỉ bỏ export `simplifyPassage` + import schema simplify.

## Related Code Files
- Delete: `app/api/passages/[id]/simplify/route.ts` (xoá cả thư mục `simplify/`)
- Modify: `server/modules/passage/passage-study.service.ts` — gỡ hàm `simplifyPassageForUser` (dòng ~31–80) + import/private helper chỉ nó dùng; GIỮ `generateQuestionsForPassage` + `PassageStudyServiceError`
- Modify: `contracts/study/passage-schema.ts` — gỡ `simplifyPassageResponseSchema`, `simplifyPassageActionResponseSchema`, type `SimplifyPassageResponse`
- Modify: `features/content-panel/api-client/passages-client.ts` — gỡ export `simplifyPassage` + import schema simplify (giữ file cho Phase 2)
- Modify: `features/study-workspace/hooks/use-study-actions.ts` — gỡ `handleSimplify` + import `simplifyPassage`; bỏ khỏi return object
- Modify: `features/content-panel/ui/content-panel.tsx` — gỡ nút simplify, `SimplifyModal` state/UI, prop `simplifying` + `onSimplify`, nhánh render loading simplify
- Modify: `features/study-workspace/ui/study-workspace-client.tsx` — bỏ truyền `simplifying={state.simplifying}` + `onSimplify={handleSimplify}` xuống content-panel; bỏ `handleSimplify` khỏi destructure
- Modify: `features/study/shared/types.ts` — gỡ field `simplifying` khỏi `StudyState` (nếu chỉ simplify dùng); GIỮ `simplifiedContent/simplifiedLevel` trên `PassageData`
- Modify: `messages/*.json` — gỡ key `Study.simplify*` (simplify, simplifyingContent, simplificationFailed, ...)

## Implementation Steps
1. Grep xác nhận cuối: `rg -n "simplifyPassageForUser" server/` chỉ còn định nghĩa; `rg -rn "handleSimplify|onSimplify|simplifying" features/` để liệt kê hết call-site.
2. Xoá thư mục `app/api/passages/[id]/simplify/`.
3. Trong `passage-study.service.ts`: gỡ `simplifyPassageForUser` + helper/import riêng của nó. Chạy `rg` đảm bảo `PassageStudyServiceError`, `generateQuestionsForPassage` còn nguyên.
4. `passage-schema.ts`: gỡ 2 schema simplify + type. Giữ `passageSchema`.
5. `passages-client.ts`: gỡ `simplifyPassage` + import `simplifyPassageActionResponseSchema`.
6. `use-study-actions.ts`: gỡ `handleSimplify` + import; xoá khỏi return.
7. `content-panel.tsx`: gỡ UI simplify (nút, modal, loading state, props). Xoá prop khỏi interface component.
8. `study-workspace-client.tsx`: ngừng truyền `simplifying`/`onSimplify`; bỏ `handleSimplify` khỏi destructure `useStudyActions`.
9. `StudyState`: gỡ `simplifying`.
10. `messages/*.json`: gỡ key simplify (tất cả locale).
11. `pnpm typecheck` → sửa lỗi tham chiếu còn sót.

## Success Criteria
- [ ] Không còn file/route simplify; `rg -rn "simplif" app/ features/ server/ contracts/` chỉ còn `simplifiedContent/simplifiedLevel` (trường DB) — không còn hàm/nút/route simplify.
- [ ] `generateQuestionsForPassage` + `/api/studio/questions` vẫn build.
- [ ] `pnpm typecheck` sạch.

## Risk Assessment
- **Xoá nhầm `PassageStudyServiceError`** → vỡ studio/questions. Mitigation: grep sau khi sửa; giữ class + `generateQuestionsForPassage`.
- **`simplifiedContent` bị tưởng là của simplify** → xoá nhầm trường upload sinh ra. Mitigation: chỉ gỡ luồng on-demand, giữ field + `passageSchema`.
- **i18n sót key** → không lỗi build nhưng rác. Mitigation: grep `simplif` trong `messages/`.

## Execution Notes (as implemented)
- Phát hiện thêm: `app/api/studio/questions/route.ts` import `passage-study.service` sai path (pre-existing, `@/server/modules/study/passage/...` thay vì `@/server/modules/passage/...`) → sửa để giữ đúng success criteria "studio/questions vẫn build".
- Phát hiện thêm: `content-panel.tsx` có 3 import alias hỏng pre-existing (`@/features/study/content-panel/...` → thực tế `@/features/content-panel/...`) → sửa vì nằm ngay trong file đang chỉnh, chặn typecheck.
- Đã verify bằng `git stash` baseline: toàn bộ lỗi typecheck còn lại sau phase này là pre-existing, không phải do phase này gây ra.
- Key i18n `confirm` (Study namespace) cũng xoá theo vì chỉ dialog simplify dùng, giờ mồ côi; `cancel` giữ (upload-modal còn dùng).
