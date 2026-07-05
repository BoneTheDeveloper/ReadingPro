---
phase: 4
title: Vocabulary Action
status: completed
effort: ''
---

# Phase 4: Vocabulary Action

## Overview

Chuyển lời gọi `fetch("/api/vocabulary")` trong `study-workspace-client.tsx` (lưu từ vựng đã tra) sang Server Action. **QUAN TRỌNG**: `POST /api/vocabulary` route KHÔNG được xoá — `features/dictionary/api-client/dictionary-client.ts` (feature khác, ngoài phạm vi đợt này) cũng gọi route này. Chỉ thêm 1 action song song, route vẫn giữ nguyên phục vụ dictionary feature.

## Related Code Files
- Modify: `features/study-workspace/actions.ts` — thêm `saveVocabularyAction`
- Modify: `features/study-workspace/ui/study-workspace-client.tsx` — `handleSaveVocabulary` gọi action thay vì `fetch`
- KHÔNG xoá: `app/api/vocabulary/route.ts` (còn consumer khác: `features/dictionary/api-client/dictionary-client.ts`)

## Implementation Steps

1. Trong `features/study-workspace/actions.ts` (đã có `deletePassageAction`), thêm `saveVocabularyAction(input: {...})`: nhận đúng shape input hiện `study-workspace-client.tsx` đang gửi (`selectedText`, `translation`, `contextSentence`, `sourceId?`, `sourceLanguage: "en"`, `targetLanguage: "vi"`, `type?`), validate bằng zod tương đương `vocabularyRequestSchema` trong route cũ (subset field cần dùng — không cần `source`/`dictionaryEntryId`/`dictionarySenseId` vì workspace luôn gửi `source: "TRANSLATE"` mặc định), gọi `getUserId()` + `saveVocabularyItem({ ...input, userId })` (từ `server/modules/vocabulary/vocabulary.service.ts`), trả về `toVocabularyDTO(item)` (import từ `app/api/vocabulary/vocabulary-dto-mapper.ts`).
2. Sửa `handleSaveVocabulary` trong `study-workspace-client.tsx`: bỏ `fetch("/api/vocabulary")` + `vocabularyResponseSchema.safeParse`, gọi trực tiếp `await saveVocabularyAction(vocabularyPayload)` trong try/catch, giữ nguyên toàn bộ logic sau đó (set `savedVocabularyIds`, breadcrumbs).
3. KHÔNG xoá import `vocabularyResponseSchema` khỏi `contracts/translation/translation-response-schema.ts` (vẫn dùng bởi `dictionary-client.ts`) — chỉ bỏ usage trong `study-workspace-client.tsx`.
4. Chạy `pnpm typecheck && pnpm lint`.

## Success Criteria

- [ ] `study-workspace-client.tsx` không còn `fetch("/api/vocabulary")`
- [ ] `app/api/vocabulary/route.ts` KHÔNG bị xoá, `dictionary-client.ts` không bị ảnh hưởng (grep xác nhận vẫn gọi route như cũ)
- [ ] `pnpm typecheck && pnpm lint` sạch

## Risk Assessment
Rủi ro: nhầm tưởng route hết consumer rồi xoá — đã xác nhận bằng grep có `dictionary-client.ts` dùng chung route (dòng 104), TUYỆT ĐỐI không xoá route trong phase này.
