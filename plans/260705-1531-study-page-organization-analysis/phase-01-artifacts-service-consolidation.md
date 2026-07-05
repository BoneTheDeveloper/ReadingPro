---
phase: 1
title: Artifacts Service Consolidation
status: completed
effort: ''
---

# Phase 1: Artifacts Service Consolidation

## Overview

Fix vi phạm service-layer convention: `app/api/studio/artifacts/[id]/route.ts` (GET question detail) hiện gọi Prisma `db` trực tiếp thay vì qua `studio-artifacts-service.ts` như route anh em. Thêm hàm service mới, route gọi qua đó. Route vẫn giữ nguyên là Route API ở phase này — việc convert sang Server Action nằm ở Phase 2. Tách riêng để mỗi diff dễ verify.

## Related Code Files
- Modify: `server/modules/passage/studio-artifacts-service.ts` — thêm hàm `getArtifactQuestions`
- Modify: `app/api/studio/artifacts/[id]/route.ts` — gọi service thay vì Prisma trực tiếp

## Implementation Steps

1. Trong `studio-artifacts-service.ts`, thêm hàm `getArtifactQuestions(userId: string, artifactId: string): Promise<{ questions: QuestionData[] }>` — di chuyển nguyên logic hiện có trong route: query `db.question.findMany({ where: { artifactId, artifact: { userId } }, orderBy: { createdAt: "asc" }, select: {...} })`, fallback check `db.studioArtifact.findFirst` khi rỗng để phân biệt "chưa có câu hỏi" vs "không tồn tại/không sở hữu" (ném lỗi khi không tìm thấy artifact), map bằng `parseQuestionOptions` (di chuyển helper này vào cùng file service).
2. Import `QuestionData` type từ `@/features/study/shared/types` trong service file.
3. Sửa `app/api/studio/artifacts/[id]/route.ts`: xoá import `db`, `parseQuestionOptions` cục bộ; gọi `getArtifactQuestions(userId, id)`; giữ nguyên response shape `{ success: true, data: { questions } }` và xử lý lỗi 401/404/500 như cũ (bắt lỗi "not found" ném từ service để trả 404).

## Success Criteria

- [ ] `getArtifactQuestions` tồn tại trong `studio-artifacts-service.ts`, route không còn import `db`
- [ ] `pnpm typecheck && pnpm lint` sạch (không phát sinh lỗi mới so với baseline)
- [ ] Response shape của `GET /api/studio/artifacts/[id]` không đổi (vẫn phục vụ được client hiện tại trước khi Phase 2 xoá route)

## Risk Assessment
Rủi ro thấp — thuần di chuyển code, không đổi hành vi/response shape. Rủi ro duy nhất: bỏ sót fallback check "artifact tồn tại nhưng chưa có câu hỏi" khi di chuyển logic — verify bằng cách đọc lại route gốc trước khi xoá.
