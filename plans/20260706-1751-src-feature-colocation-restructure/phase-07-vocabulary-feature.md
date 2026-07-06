---
phase: 7
title: "Vocabulary feature"
status: pending
priority: P1
effort: "4h"
dependencies: [1, 2, 3, 6]
---

# Phase 7: Vocabulary feature

## Overview

Gộp `features/vocabulary/*`, `server/modules/vocabulary/*`, `contracts/vocabulary/*`, `server/modules/spaced-repetition/*` (chỉ 1 consumer là vocabulary), `app/api/vocabulary/*` (7 route) vào `features/vocabulary/{components,db,schemas,hooks}`. Đồng thời SỬA duplicate: bản `normalizeDictionaryTerm` trong `translation-queries.ts` (giữ punctuation) khác bản gốc trong `features/dictionary/schemas/` (strip punctuation). **Phối hợp Phase 11:** Phase 7 đổi vocabulary import → dictionary feature. Phase 11 xoá bản trùng trong `translation-queries.ts`. Nếu `translation-queries.ts` vẫn còn ở Phase 7 → Phase 7 phải đợi Phase 11 chạy trước.

## Requirements

- Functional: 7 API vocabulary route hoạt động y hệt; spaced-repetition scheduler tính đúng lịch ôn tập; vocabulary list/set/stats UI không đổi hành vi
- Non-functional: xoá import trùng lặp `normalizeDictionaryTerm`, không để 2 bản cùng tồn tại

## Architecture

```
features/vocabulary/
├── components/    ← vocabulary-item-card, vocabulary-list, vocabulary-page-client, vocabulary-page-ui, vocabulary-set-list, vocabulary-set-row
├── db/             ← server/modules/vocabulary/* + spaced-repetition/scheduler.ts
├── schemas/        ← vocabulary-response-schema.ts, vocabulary-types.ts (từ contracts/vocabulary + features/vocabulary/model)
├── lib/             ← vocabulary-helpers.ts (nếu có helper nhỏ); **xoá `vocabulary-dtos.ts`** vì chỉ re-export types từ vocabulary-response-schema.ts — consumer import thẳng từ schema
└── hooks/          ← use-vocabulary-list, use-vocabulary-sets, use-vocabulary-stats
```

## Related Code Files

- Create: cấu trúc `features/vocabulary/{components,db,schemas,hooks,lib}` đầy đủ
- Modify: 7 file `app/api/vocabulary/**/route.ts` (đổi import), `vocabulary-items.repository.ts` → sửa import `normalizeDictionaryTerm` sang `@/features/dictionary/schemas/normalize-dictionary-term`
- Delete: `src/contracts/vocabulary/vocabulary-dtos.ts` (xoá — chỉ re-export types, không có logic); `src/contracts/vocabulary/` còn lại; `src/server/modules/vocabulary/`, `src/server/modules/spaced-repetition/`, file cũ trong `features/vocabulary/` gốc

## Implementation Steps

1. Grep xác nhận `server/modules/spaced-repetition/scheduler.ts` chỉ dùng bởi vocabulary (đã xác nhận ở brainstorm — 1 consumer)
2. Đọc toàn bộ file nguồn 4 khu vực
3. Tạo cấu trúc mới trong `features/vocabulary/`, gộp scheduler.ts vào `db/`
4. `vocabulary-dtos.ts` → **xoá** (chỉ re-export types); consumer import thẳng từ `vocabulary-response-schema.ts`
5. **Sửa `normalizeDictionaryTerm` import**: trong `vocabulary-items.repository.ts` (đã move vào `features/vocabulary/db/`), đổi import trỏ về `@/features/dictionary/schemas/normalize-dictionary-term`. Lưu ý: bản trùng trong `translation-queries.ts` vẫn còn (Phase 11 sẽ xoá). Verify export name `normalizeDictionaryTerm` tồn tại ở target path trước khi sửa.
6. Sửa 7 route `app/api/vocabulary/**/route.ts` trỏ import mới
7. Xoá `contracts/vocabulary/`, `server/modules/vocabulary/`, `server/modules/spaced-repetition/`, file cũ trong `features/vocabulary/` gốc
8. `pnpm run typecheck && pnpm run lint`
9. Test thủ công: vocabulary list, set CRUD, review flow (spaced repetition), stats

## Success Criteria

- [ ] `features/vocabulary/` theo cấu trúc mới, `vocabulary-dtos.ts` đã xoá (chỉ re-export), `contracts/vocabulary/`, `server/modules/vocabulary/`, `server/modules/spaced-repetition/` đã xoá
- [ ] `normalizeDictionaryTerm` chỉ còn 1 bản duy nhất (trong dictionary feature), vocabulary import đúng bản đó
- [ ] 7 API route vocabulary hoạt động đúng
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] Test thủ công vocabulary list/set/review/stats pass

## Risk Assessment

Rủi ro cao nhất trong các phase feature đơn lẻ — nhiều route nhất (7), sửa cả import chéo dictionary. Mitigation: làm sau dictionary (phase 6) để có sẵn đích import đúng; test kỹ review flow vì liên quan spaced-repetition logic (sai sót ảnh hưởng lịch ôn tập của user thật).
