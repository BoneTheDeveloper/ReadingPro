---
title: "Passage mutations to Server Actions (action-only, no reorg)"
description: "Remove simplify + dead create/POST path; convert passage DELETE to a server action; move the passage list to a server-authoritative (Model A) data-flow. No feature-folder reorganization."
status: pending
priority: P2
branch: "preview"
tags: [refactor, server-actions, passage]
blockedBy: []
blocks: []
created: "2026-07-05T07:40:54.622Z"
createdBy: "ck:plan"
source: skill
---

# Passage mutations to Server Actions (action-only, no reorg)

## Overview

Chuyển mutation passage sang **Server Action**, giữ route cho phần phức tạp (upload). Cụ thể: gỡ tính năng `simplify`, gỡ code chết `POST /api/passages` (đường tạo passage trùng lặp, đang 404), chuyển `DELETE /api/passages/[id]` thành **1 server action** `deletePassage`, và đổi luồng dữ liệu danh sách passage sang **server-authoritative (Model A)** với `useOptimistic`. Upload (`/api/upload`, `/api/upload/text`) **giữ nguyên route**. Hiển thị/query **giữ RSC** (`study/page.tsx`).

**KHÔNG làm lần này** (user reorg sau): di chuyển thư mục `features/`, move `types.ts`, gom namespace `features/study/`, đụng studio/vocab/dictionary.

Nguồn: [brainstorm-summary.md](./brainstorm-summary.md).

## Key verified facts (đã grep)

- `server/modules/passage/passage-study.service.ts` còn export `generateQuestionsForPassage` + `PassageStudyServiceError` dùng bởi `app/api/studio/questions/route.ts` → **chỉ gỡ hàm `simplifyPassageForUser` (dòng 31–80)**, KHÔNG xoá file.
- `createPassageRecord` (`server/modules/upload/passage-create/passage-create.service.ts`) **chỉ** `POST /api/passages/route.ts` dùng → xoá được cả file service.
- `deletePassage(passageId, userId)` có sẵn tại `server/db/passage-queries.ts:116`.
- `content-panel/api-client/passages-client.ts` gọi `/api/study/passages*` (không tồn tại → 404). Consumer: `upload-modal` (createPassage) + `use-study-actions` (simplify) + `use-study-workspace-state` (delete).
- Schema thừa trong `contracts/study/passage-schema.ts`: `createPassageRequestSchema`, `simplifyPassageResponseSchema`, `simplifyPassageActionResponseSchema`, `passageResponseSchema`. Giữ `passageSchema` + trường `simplifiedContent/simplifiedLevel` (upload vẫn sinh ra).
- i18n ở **root `messages/*.json`** (không phải `src/messages`).
- `handleDeletePassage` hiện đã reconcile active client-side bằng `getMostRecentPassageId` — Model A giữ logic reconcile, đổi nguồn list sang props + `useOptimistic`, thay client-fetch bằng server action.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Remove simplify feature](./phase-01-remove-simplify-feature.md) | Pending |
| 2 | [Remove dead create/POST passage path](./phase-02-remove-dead-create-post-passage-path.md) | Pending |
| 3 | [deletePassage server action + Model A data-flow](./phase-03-deletepassage-server-action-model-a-data-flow.md) | Pending |
| 4 | [Verify typecheck lint test](./phase-04-verify-typecheck-lint-test.md) | Pending |

## Dependencies

- Phase 2 → sau Phase 1 (cả 2 dọn `passages-client.ts`; gỡ simplify trước tránh sửa 2 lần).
- Phase 3 → sau Phase 2 (`passages-client.ts` đã sạch consumer → thay bằng action + Model A).
- Phase 4 → cuối (verify toàn bộ).
- Không có cross-plan dependency (scan `./plans/` không thấy plan passage/upload đang mở khác).

## Out of scope

Reorg `features/`, move `types.ts` (17 import), namespace `features/study/`, studio/vocab/dictionary, đổi UI upload route.
