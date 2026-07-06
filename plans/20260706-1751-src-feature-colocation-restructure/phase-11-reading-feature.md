---
phase: 11
title: "Reading feature (content-panel + inline translate)"
status: pending
priority: P1
effort: "4h"
dependencies: [1, 2, 3, 6, 8]
---

# Phase 11: Reading feature (content-panel + inline translate)

## Overview

Tạo `features/reading/` — luồng ĐỌC passage: hiển thị nội dung, scroll progress, CEFR badge, bắt selection, và inline translate (chọn text → popup dịch). Quyết định đã chốt: inline translate thuộc reading (đúng bản chất UX), KHÔNG thuộc studio. `translation-popup.tsx` hiện nằm sai chỗ trong `features/studio-panel/ui/studio/translate/` — chuyển về đây.

## Requirements

- Functional: đọc passage, scroll progress, chọn text → popup dịch → dịch nhanh (cache + history) hoạt động y hệt; `/api/translate` không đổi hành vi
- Non-functional: xoá bản `normalizeDictionaryTerm` trùng lặp trong translation-queries khi di chuyển (dùng bản gốc từ `features/dictionary`); xoá dead code `server/modules/translation/quick-selection-scope.ts` (0 consumer); ownership check dùng `features/passage/db` (bỏ `getOwnedTranslationSource` riêng)

## Architecture

```
features/reading/
├── components/    ← content-panel.tsx (+ cefr-style.ts từ features/content-panel/lib/), translation-popup.tsx (từ studio-panel/ui/studio/translate/)
├── db/             ← translation-queries.ts (cache/history, BỎ normalizeDictionaryTerm trùng + getOwnedTranslationSource), inline-translate.service.ts, inline-translate.repository.ts, word-translate.ts, translation-provider.ts (từ server/modules/translation/)
├── schemas/        ← translation-response-schema.ts, translation-limits.ts, text-utils.ts (từ contracts/translation/), reading-types.ts (TranslationSelection, QuickTranslationData, TranslationProvider — tách từ features/study/shared/types.ts)
└── hooks/          ← selection-utils.ts, use-scroll-progress.ts (từ features/content-panel/hooks/)
```

## Related Code Files

- Create: cấu trúc `features/reading/{components,db,schemas,hooks}` như trên
- Modify: `app/api/translate/route.ts` (đổi import sang features/reading + features/passage cho ownership), `features/study-workspace/ui/study-workspace-client.tsx` (đổi import content-panel + translation-popup), `features/study/shared/types.ts` (re-export reading types từ chỗ mới)
- Delete: `features/content-panel/` (toàn bộ), `server/modules/translation/` (toàn bộ, gồm dead code quick-selection-scope.ts), `contracts/translation/`, `server/db/translation-queries.ts`, thư mục `features/studio-panel/ui/studio/translate/`

## Implementation Steps

1. Đọc toàn bộ file nguồn: `features/content-panel/*`, `server/modules/translation/*`, `contracts/translation/*`, `server/db/translation-queries.ts`, `translation-popup.tsx`
2. **Per-file consumer verification trước khi xoá translation module:** với mỗi file trong `server/modules/translation/`, grep consumer — tất cả phải được migrate HOẶC là file đang xoá. Đặc biệt verify `translation-provider.ts` không còn consumer chưa migrate.
3. Tạo `features/reading/schemas/reading-types.ts` (TranslationSelection, QuickTranslationData, TranslationProvider); `features/study/shared/types.ts` re-export
4. Chuyển translation db files vào `features/reading/db/`: XOÁ `normalizeDictionaryTerm` (duplicate — Phase 7 đã fix import sang dictionary feature), XOÁ `getOwnedTranslationSource` (thay bằng `findOwnedPassage` từ `features/passage/db`)
5. Chuyển content-panel components + hooks, translation-popup vào reading
6. Sửa `app/api/translate/route.ts` + `study-workspace-client.tsx` trỏ import mới
7. Xoá các thư mục/file nguồn cũ (content-panel, server/modules/translation, contracts/translation, translation-queries.ts) — **sau khi Step 2 verified**
8. `pnpm run typecheck && pnpm run lint`
9. Test thủ công: đọc passage, scroll progress, chọn text → popup dịch hiện đúng vị trí → kết quả dịch đúng, dịch lại lần 2 ăn cache

## Success Criteria

- [ ] `features/reading/` hoàn chỉnh; `features/content-panel/`, `server/modules/translation/`, `contracts/translation/`, `server/db/translation-queries.ts` đã xoá
- [ ] Per-file consumer verify: mỗi file trong `translation/` đã migrate hoặc đã xoá
- [ ] `normalizeDictionaryTerm` chỉ còn 1 bản (bản gốc trong `features/dictionary/schemas/`) — grep verify
- [ ] `quick-selection-scope.ts` đã xoá (0 consumer)
- [ ] Ownership check translate đi qua `features/passage/db`
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] Test thủ công đọc + dịch inline pass

## Risk Assessment

Rủi ro trung bình-cao — luồng selection → translate xuyên 3 tầng (content-panel bắt selection, workspace điều phối, popup hiển thị), sửa sai dễ vỡ interaction. Mitigation: chạy sau phase 8 (passage đã có ownership chuẩn); test popup ở cả desktop + mobile viewport vì popup định vị theo selection.
