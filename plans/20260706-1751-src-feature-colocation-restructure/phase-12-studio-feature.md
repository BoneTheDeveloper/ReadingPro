---
phase: 12
title: "Studio feature (quiz/chat/lookup)"
status: pending
priority: P1
effort: "4h"
dependencies: [1, 2, 3, 8, 11]
---

# Phase 12: Studio feature (quiz/chat/lookup)

## Overview

Gộp phần TƯƠNG TÁC HỌC vào `features/studio/`: quiz (sinh câu hỏi AI + artifacts + ghi kết quả), chat AI về passage, lookup panel. ĐÃ THAY ĐỔI so với thiết kế ban đầu (sau brainstorm passage): translation KHÔNG thuộc studio nữa (đã về `features/reading/` phase 11), passage entity KHÔNG thuộc studio (đã về `features/passage/` phase 8). Studio giờ chỉ gồm: `server/modules/passage/` (question-gen + artifacts — tên thư mục cũ gây nhầm, thực chất là studio logic), `server/modules/ai-chat/`, `contracts/study/*`, `features/studio-panel/*` (trừ translate popup đã đi), `app/api/studio/*`, và phần question (`questionDataSchema`, `createQuestion`) còn re-export trong `server/db/passage-queries.ts`.

## Requirements

- Functional: chat panel, quiz (sinh câu hỏi, làm bài, xem kết quả, reset), lookup panel hoạt động y hệt; `/api/studio/chat`, `/api/studio/questions` không đổi hành vi; 5 server action trong `features/studio-panel/actions.ts` giữ nguyên hành vi
- Non-functional: ownership check passage dùng `features/passage/db/findOwnedPassage` (bỏ bản riêng trong passage-study.repository); đọc passage content cho chat context đi qua `features/passage/db/`

## Architecture

```
features/studio/
├── components/    ← studio-panel.tsx, studio/{chat/chat-panel, lookup/lookup-panel, quiz/quiz-content, quiz/quiz-results, studio-action-tile}.tsx (KHÔNG gồm translate/ — đã về reading)
├── actions/        ← actions.ts (5 action: getStudioArtifacts, getArtifactQuestions, recordQuizResult, resetQuizResult, getChatHistory)
├── db/             ← question-generation.service.ts + repository (từ server/modules/passage/passage-study.*), studio-artifacts-service.ts + repository, chat-service.ts, chat-utils.ts (từ server/modules/ai-chat/), questionDataSchema + createQuestion (nhặt từ server/db/passage-queries.ts re-export)
├── schemas/        ← studio-artifact-types.ts, study-response-schema.ts, chat-schema.ts (từ contracts/study/), studio-types.ts (QuestionData, QuestionOption, Artifact*, StudioAction*, ArtifactsCacheStatus... — tách từ features/study/shared/types.ts)
└── hooks/          ← use-study-artifacts.ts, studio-questions-client.ts (gộp từ api-client/)
```
Đổi tên file khi di chuyển: `passage-study.service.ts` → `question-generation.service.ts` (tên cũ gây hiểu nhầm là passage entity). Dependencies: `services/ai/`, `features/passage/db/` — import, không copy.

## Related Code Files

- Create: cấu trúc `features/studio/{components,actions,db,schemas,hooks}` như trên
- Modify: `app/api/studio/chat/route.ts`, `app/api/studio/questions/route.ts` (đổi import), `features/study-workspace/*` (import studio-panel + actions path mới), `features/study/shared/types.ts` (re-export studio types từ chỗ mới), `chat-service.ts` (đọc passage qua features/passage/db)
- Delete: `src/contracts/study/`, `src/server/modules/passage/`, `src/server/modules/ai-chat/`, `src/features/studio-panel/`, `src/server/db/passage-queries.ts` (phần re-export cuối cùng — file trống thì xoá hẳn)

## Implementation Steps

1. Đọc toàn bộ file nguồn: `features/studio-panel/*` (phần còn lại sau phase 11), `server/modules/passage/*`, `server/modules/ai-chat/*`, `contracts/study/*`, phần question trong `server/db/passage-queries.ts`
2. Tạo `features/studio/schemas/studio-types.ts` tách type studio từ `features/study/shared/types.ts`; file cũ re-export
3. Chuyển db files: đổi tên passage-study → question-generation, thay `findOwnedPassage` nội bộ bằng import từ `features/passage/db`, chat-service đọc passage qua passage feature
4. Chuyển components (trừ translate/), actions, hooks
5. Sửa 2 route studio + import trong study-workspace
6. Xoá `contracts/study/`, `server/modules/passage/`, `server/modules/ai-chat/`, `features/studio-panel/`, `server/db/passage-queries.ts`
7. `pnpm run typecheck && pnpm run lint`
8. Test thủ công: mở studio panel → sinh quiz → làm quiz → xem kết quả → reset; chat AI về passage; lookup panel

## Success Criteria

- [ ] `features/studio/` hoàn chỉnh; `contracts/study/`, `server/modules/{passage,ai-chat}/`, `features/studio-panel/`, `server/db/passage-queries.ts` đã xoá
- [ ] Studio không tự query `prisma.passage` — mọi thao tác passage qua `features/passage/db/` (grep verify)
- [ ] 2 route studio + 5 server action hoạt động đúng
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] Test thủ công quiz/chat/lookup pass

## Risk Assessment

Rủi ro cao — nhiều file nhất trong các phase còn lại, đổi tên module dễ sót import. Mitigation: chạy sau reading (phase 11) để translate đã tách sạch; chia sub-bước quiz → chat → lookup, test từng phần; grep `passage-study` sau khi xong để chắc không còn tham chiếu tên cũ.
