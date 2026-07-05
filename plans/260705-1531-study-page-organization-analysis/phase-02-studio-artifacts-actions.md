---
phase: 2
title: Studio Artifacts Actions
status: completed
effort: ''
---

# Phase 2: Studio Artifacts Actions

## Overview

Convert 4 route (list artifacts, artifact detail, record/reset quiz-result) sang Server Action, đặt trong `features/studio-panel/actions.ts` (file mới, theo đúng namespace feature — không gộp vào `study-workspace/actions.ts` vì đó là domain "passage/workspace", không phải "studio artifacts"). Xoá 3 route file + `studio-artifacts-client.ts` sau khi hết consumer.

## Related Code Files
- Create: `features/studio-panel/actions.ts` — 4 server action: `getStudioArtifactsAction`, `getArtifactQuestionsAction`, `recordQuizResultAction`, `resetQuizResultAction`
- Modify: `features/studio-panel/hooks/use-study-artifacts.ts` — gọi action thay vì `fetch`
- Modify: `features/study-workspace/hooks/use-study-actions.ts` — gọi `getArtifactQuestionsAction` thay vì `getArtifactDetail` (từ `studio-artifacts-client.ts`)
- Modify: `features/studio-panel/ui/studio/quiz/quiz-results.tsx` — gọi `recordQuizResultAction`/`resetQuizResultAction` thay vì `studio-artifacts-client.ts`
- Delete: `app/api/studio/artifacts/route.ts`, `app/api/studio/artifacts/[id]/route.ts`, `app/api/studio/artifacts/[id]/quiz-result/route.ts`
- Delete: `features/studio-panel/api-client/studio-artifacts-client.ts` (grep xác nhận hết consumer trước khi xoá — 2 consumer hiện tại: `use-study-actions.ts` dòng 7 và `quiz-results.tsx` dòng 9-11, cả 2 đều sửa ở phase này)

## Implementation Steps

1. Tạo `features/studio-panel/actions.ts` với `'use server'` ở đầu file:
   - `getStudioArtifactsAction(passageId: string)` — gọi `getUserId()` (`@/server/auth/auth-utils`) + `fetchStudioArtifacts(userId, passageId)` (từ `studio-artifacts-service.ts`), giữ validate `passageId` là UUID bằng zod trước khi gọi (tái dùng schema đang có trong route cũ hoặc inline `z.string().uuid()`), trả `{ artifacts }` hoặc ném lỗi để caller bắt.
   - `getArtifactQuestionsAction(artifactId: string)` — gọi `getArtifactQuestions(userId, artifactId)` từ Phase 1.
   - `recordQuizResultAction(artifactId: string, stats: { correctCount: number; totalQuestions: number })` — validate bằng zod schema hiện có trong route cũ (`recordQuizResultSchema`, di chuyển vào action file), gọi `recordQuizResult(artifactId, userId, stats)`.
   - `resetQuizResultAction(artifactId: string)` — gọi `resetQuizResult(artifactId, userId)`.
   - Mọi action bắt `isAuthenticationRequiredError` và ném lại message rõ ràng để client hiển thị (không có NextResponse ở server action — throw Error, caller try/catch).
2. Sửa `use-study-artifacts.ts`: bỏ `fetch`/`AbortController` (server action không hỗ trợ `AbortSignal` như fetch — giữ nguyên guard `prev.activePassageId !== passageId` đã có sẵn để chặn race condition thay cho abort), gọi `await getStudioArtifactsAction(passageId)` trong `try/catch`, map kết quả vào state y như cũ.
3. Sửa `use-study-actions.ts`: đổi import từ `studio-artifacts-client` sang `features/studio-panel/actions`, gọi `getArtifactQuestionsAction(ref.id)` thay `getArtifactDetail(ref.id)` tại dòng ~200 (giữ nguyên logic downstream, chỉ đổi nguồn gọi).
4. Sửa `quiz-results.tsx`: đổi import, gọi `recordQuizResultAction`/`resetQuizResultAction` thay vì hàm cùng tên từ `studio-artifacts-client.ts`.
5. Grep xác nhận không còn consumer nào của 3 route + `studio-artifacts-client.ts`, sau đó xoá.
6. Chạy `pnpm typecheck && pnpm lint`.

## Success Criteria

- [ ] `features/studio-panel/actions.ts` chứa 4 action, không import `NextResponse`/`NextRequest`
- [ ] `use-study-artifacts.ts`, `use-study-actions.ts`, `quiz-results.tsx` không còn `fetch` tới `/api/studio/artifacts*`
- [ ] 3 route file + `studio-artifacts-client.ts` đã xoá, `pnpm typecheck && pnpm lint` sạch
- [ ] Ownership check (userId scoping) giữ nguyên như route cũ — không nới lỏng quyền truy cập

## Risk Assessment
- Mất `AbortController` trong `use-study-artifacts.ts` — chấp nhận được vì guard `activePassageId` đã chặn stale response, nhưng cần note rõ đây là đánh đổi có chủ đích, không phải bug.
- `getArtifactDetail`/`studio-artifacts-client.ts` có 2 consumer khác nhau (workspace hook + quiz-results) — phải sửa cả 2 cùng lúc trong phase này, không tách nhỏ hơn để tránh trạng thái nửa vời.
