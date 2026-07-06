---
phase: 6
title: "Dictionary feature"
status: pending
priority: P2
effort: "3h"
dependencies: [1, 2, 3]
---

# Phase 6: Dictionary feature

## Overview

Gộp `features/dictionary/*`, `server/modules/dictionary/*`, `contracts/dictionary/*`, `app/api/dictionary/*` (4 route: entries/[entryId], lookup, search, suggest) vào `features/dictionary/{components,db,schemas,hooks}`. LƯU Ý: `contracts/dictionary/normalize-dictionary-term.ts` là bản GỐC đúng của hàm chuẩn hoá — phase Vocabulary (7) và Studio (10) sẽ trỏ về bản này thay vì bản trùng lặp trong `server/db/translation-queries.ts`.

## Requirements

- Functional: 4 API dictionary route hoạt động y hệt, dictionary suggest dropdown + entry card UI không đổi hành vi
- Non-functional: `normalizeDictionaryTerm` giữ nguyên vị trí `schemas/normalize-dictionary-term.ts` làm nguồn chân lý duy nhất — không tạo bản sao mới

## Architecture

```
features/dictionary/
├── components/    ← dictionary-entry-card.tsx, dictionary-page-client.tsx, dictionary-suggest-dropdown.tsx
├── db/             ← server/modules/dictionary/* (queries)
├── schemas/        ← dictionary-response-schema.ts, normalize-dictionary-term.ts (từ contracts/dictionary/); `getSourceLabel()` + const arrays từ dictionary-dtos.ts gộp vào schema hoặc tách `lib/dictionary-helpers.ts`
├── lib/             ← `dictionary-helpers.ts` (getSourceLabel, RUNTIME_STATUSES, VALID_TRANSLATION_STATUSES, VALID_SOURCE_TYPES)
└── hooks/          ← use-dictionary-entry-detail.ts, use-dictionary-suggest.ts, use-save-dictionary-vocabulary.ts
```

## Related Code Files

- Create: cấu trúc `features/dictionary/{components,db,schemas,hooks,lib}` đầy đủ; `lib/dictionary-helpers.ts` (getSourceLabel, RUNTIME_STATUSES, VALID_TRANSLATION_STATUSES, VALID_SOURCE_TYPES)
- Modify: 4 file `app/api/dictionary/**/route.ts` (đổi import), consumer import `getSourceLabel` từ `lib/` nếu cần
- Delete: `src/contracts/dictionary/dictionary-dtos.ts` (xoá — chỉ re-export types, không có logic); `src/contracts/dictionary/` còn lại; `src/server/modules/dictionary/`, file cũ trong `features/dictionary/` gốc

## Implementation Steps

1. Grep tất cả consumer của `contracts/dictionary/normalize-dictionary-term` và `server/modules/dictionary/*` — xác nhận scope trước khi xoá
2. Đọc toàn bộ file nguồn 4 khu vực (features/dictionary, server/modules/dictionary, contracts/dictionary, app/api/dictionary)
3. Tạo cấu trúc mới trong `features/dictionary/`: `schemas/`, `lib/`
4. `dictionary-dtos.ts` → **xoá** (chỉ re-export types); lấy `getSourceLabel()`, `RUNTIME_STATUSES`, `VALID_TRANSLATION_STATUSES`, `VALID_SOURCE_TYPES` → cho vào `lib/dictionary-helpers.ts` hoặc gộp vào schema nếu nhỏ
5. Sửa 4 route `app/api/dictionary/**/route.ts` trỏ import mới
6. Xoá `contracts/dictionary/`, `server/modules/dictionary/`, file cũ trong `features/dictionary/`
7. `pnpm run typecheck && pnpm run lint`
8. Test thủ công: dictionary lookup, search, suggest dropdown, lưu từ vựng từ dictionary

## Success Criteria

- [ ] `features/dictionary/` theo cấu trúc mới (`schemas/`, `lib/`), `dictionary-dtos.ts` đã xoá (chỉ re-export), `contracts/dictionary/` và `server/modules/dictionary/` đã xoá
- [ ] 4 API route dictionary hoạt động đúng
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] Test thủ công lookup/search/suggest/save-vocabulary pass

## Risk Assessment

Rủi ro trung bình — `normalize-dictionary-term` bị dùng chéo bởi vocabulary (qua bản trùng lặp sai). Phase này CHƯA sửa `vocabulary-items.repository.ts` (để dành phase 7) — chỉ đảm bảo bản gốc trong dictionary feature không bị mất khi di chuyển.
