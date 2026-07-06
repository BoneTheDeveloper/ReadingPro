---
phase: 13
title: "Study page compose (colocate workspace vào route)"
status: complete
priority: P2
effort: "3h"
dependencies: [4, 5, 6, 7, 8, 9, 10, 11, 12]
---

# Phase 13: Study page compose (colocate workspace vào route)

## Overview

QUYẾT ĐỊNH ĐÃ ĐỔI (brainstorm round 3): `study-workspace` KHÔNG phải feature — nó là UI glue của đúng 1 trang `/study` (ghép 4 panel, state điều phối, layout). Không có DB/schema/business logic riêng. Phase này: colocate toàn bộ vào route `app/[locale]/(dashboard)/study/` bằng private folders (`_components`, `_hooks`), tách nốt type hub `features/study/shared/types.ts`, dời `saveVocabularyAction` về vocabulary, xoá `features/study-workspace/` và `features/study/`. Sau phase này `features/` CHỈ còn domain thật.

## Requirements

- Functional: trang study hiển thị đúng, toàn bộ tương tác giữa panel không đổi hành vi (chọn văn bản → dịch → lưu vocabulary → chat AI → quiz → xoá passage)
- Non-functional: `features/study-workspace/` và `features/study/` không còn tồn tại; `app/[locale]/(dashboard)/study/` chứa page + glue, KHÔNG chứa business logic (mọi logic import từ features)

## Architecture

```
app/[locale]/(dashboard)/study/
├── page.tsx                        # RSC (đã có): auth + getUserPassages từ features/passage → truyền client
├── _components/
│   └── study-workspace-client.tsx  # từ features/study-workspace/ui/
├── _hooks/
│   ├── use-study-panel-layout.ts
│   ├── use-study-workspace-state.ts
│   └── use-study-actions.ts
└── _types.ts                        # StudyState, StudyUploadModalProps + type glue còn lại của features/study/shared/types.ts
```
Next.js coi thư mục `_prefix` là private — không thành route. Glue chỉ có 1 consumer (page này) nên colocate cạnh consumer, đúng nguyên tắc colocation.

Phân bổ type cuối của `features/study/shared/types.ts` (**19 consumer** — grep verified):
- PassageData, StudyStatus, SourceType, DocumentItem → `features/passage/schemas/` (đã xong phase 8)
- TranslationSelection, QuickTranslationData, TranslationProvider → `features/reading/schemas/` (đã xong phase 11)
- QuestionData, QuestionOption, Artifact*, StudioAction* → `features/studio/schemas/` (đã xong phase 12)
- StudyState, StudyUploadModalProps + phần còn lại → `_types.ts` của route (phase này)

`saveVocabularyAction` → `features/vocabulary/actions/save-vocabulary.ts` (mutation của vocabulary, page chỉ gọi).

## Related Code Files

- Create: `app/[locale]/(dashboard)/study/{_components,_hooks,_types.ts}`, `features/vocabulary/actions/save-vocabulary.ts`
- Modify: `app/[locale]/(dashboard)/study/page.tsx` (import client từ `./_components/`), các consumer còn import `features/study/shared/types` (sửa trỏ feature sở hữu hoặc `_types.ts`)
- Delete: `src/features/study-workspace/` (toàn bộ), `src/features/study/` (toàn bộ)

## Implementation Steps

1. Grep tất cả import `features/study/shared/types` còn lại — đếm đủ 19 consumer, phân loại từng type theo chủ sở hữu
2. **Pre-verify target paths:** `ls features/passage/schemas/` (Phase 8), `ls features/reading/schemas/` (Phase 11), `ls features/studio/schemas/` (Phase 12) — mỗi phải tồn tại trước khi migrate consumers của nó. Nếu không tồn tại → phase chưa hoàn → block.
3. Sửa từng consumer import thẳng chỗ mới; typecheck sau mỗi nhóm (passage → reading → studio → glue)
2. Tạo `_types.ts` cho type glue còn lại
3. Chuyển `study-workspace-client.tsx` → `_components/`, 3 hook → `_hooks/`, sửa import nội bộ
4. Dời `saveVocabularyAction` → `features/vocabulary/actions/save-vocabulary.ts`, sửa caller
5. Sửa `page.tsx` import từ `./_components/study-workspace-client`
6. Xoá `features/study-workspace/`, `features/study/`
7. Grep xác nhận: không còn ai import `features/study-workspace` hay `features/study/`; `_components`/`_hooks` không chứa import `@/server/*`, `@/contracts/*`
8. `pnpm run typecheck && pnpm run lint`
9. Test thủ công đầy đủ luồng: mở trang study → đọc bài → chọn từ → dịch → lưu vocabulary → chat AI → quiz → xoá passage — không lỗi console

## Success Criteria

- [ ] `features/study-workspace/`, `features/study/` đã xoá; glue nằm trong route private folders
- [ ] `features/` chỉ còn domain thật (passage, reading, studio, upload, dictionary, vocabulary, progress, learning-session, users)
- [ ] Mọi type về đúng chủ sở hữu, `saveVocabularyAction` trong vocabulary
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] Test thủ công full flow pass, không lỗi console

## Risk Assessment

Rủi ro cao — sửa **19 consumer** type hub + di dời compose layer cùng lúc, đây là core UX của app. Mitigation: chạy SAU CÙNG khi mọi feature con ổn định; sửa theo từng type-group và typecheck sau mỗi nhóm; verify mỗi target path tồn tại trước khi migrate; giữ tên file không đổi khi move (chỉ đổi thư mục) để diff dễ review.
