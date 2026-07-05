---
phase: 3
title: "deletePassage server action + Model A data-flow"
status: pending
priority: P1
effort: "3h"
dependencies: [2]
---

# Phase 3: deletePassage server action + Model A data-flow

## Overview

Chuyển `DELETE /api/passages/[id]` thành **server action** `deletePassage` (đặt trong `features/study-workspace/actions.ts`) và đổi danh sách passage sang **server-authoritative (Model A)**: list lấy từ `initialPassages` props (RSC), bỏ khỏi `useState`, dùng `useOptimistic` cho add/remove tức thì; upload xong `router.refresh()`. Đây là phase nặng nhất.

## Requirements
- Functional: xoá passage qua server action; hàng biến mất tức thì (optimistic); nếu passage đang mở bị xoá → chọn passage mới nhất còn lại (hết → idle). Upload xong danh sách tự cập nhật từ server.
- Non-functional: 1 nguồn sự thật (DB); không còn client fetch tới `/api/passages`; `pnpm typecheck` sạch.

## Architecture

**Server action** (`'use server'`):
```ts
// features/study-workspace/actions.ts
"use server";
import { revalidatePath } from "next/cache";
import { getUserId } from "@/server/auth/auth-utils";
import { deletePassage as deletePassageQuery } from "@/server/db/passage-queries";

export async function deletePassageAction(passageId: string) {
  const userId = await getUserId();
  await deletePassageQuery(passageId, userId);
  revalidatePath("/study");
}
```

**Model A trong `use-study-workspace-state`**:
- List nguồn = `initialPassages` (props). Bỏ `passages` khỏi `StudyState`.
- `const [optimisticPassages, applyOptimistic] = useOptimistic(initialPassages, reducer)` — reducer xử lý `{type:'remove', id}` và `{type:'add', passage}`.
- `documents`/`activePassage` derive từ `optimisticPassages`.
- `activePassageId` vẫn là client state; nếu id không còn trong list → fallback `getMostRecentPassageId(optimisticPassages)`.

**Delete flow**: `startTransition(() => { applyOptimistic({type:'remove',id}); await deletePassageAction(id); })`; reconcile `activePassageId` nếu id đang active. `revalidatePath` làm props mới về → optimistic reset về base mới.

**Upload flow (route giữ nguyên)**: `handleUploadComplete` → `applyOptimistic({type:'add', passage})` + `setActivePassageId(passage.id)` + `router.refresh()` (kéo bản đầy đủ từ RSC). `use-upload-submit` đổi `router.push('/study')` → `router.refresh()` (đang ở /study rồi).

**Guards trong `use-study-actions`**: hiện đọc `state.passages.find(...)` (retryQuizArtifact, handleActionClick). Truyền `passages` (optimistic list) vào `useStudyActions({state, setState, passages})` và đổi guard đọc từ đó.

## Related Code Files
- Create: `features/study-workspace/actions.ts` — `'use server'` `deletePassageAction`
- Delete: `app/api/passages/[id]/route.ts` (DELETE route) — và thư mục `app/api/passages/` nếu rỗng sau Phase 2
- Delete: `features/content-panel/api-client/passages-client.ts` (giờ rỗng sau Phase 1–2)
- Modify: `features/study-workspace/hooks/use-study-workspace-state.ts` — bỏ `passages` khỏi state; `useOptimistic`; đổi `handleDeletePassage` gọi action; `handleUploadComplete` optimistic add + `router.refresh()`; nhận `initialPassages` làm nguồn
- Modify: `features/study-workspace/ui/study-workspace-client.tsx` — `initialPassages` truyền vào hook làm nguồn list; `documents`/`activePassage` từ optimistic list
- Modify: `features/study-workspace/hooks/use-study-actions.ts` — nhận `passages` param; guard đọc từ đó thay `state.passages`
- Modify: `features/source-panel/hooks/use-upload-submit.ts` — `router.refresh()` thay `router.push('/study')`; sửa import alias lệch `@/features/study/source-panel/...` → path thật
- Modify: `features/study/shared/types.ts` — bỏ `passages` khỏi `StudyState`

## Implementation Steps
1. Tạo `features/study-workspace/actions.ts` với `deletePassageAction`.
2. Xoá route `app/api/passages/[id]/route.ts`; xoá `passages-client.ts`.
3. `use-study-workspace-state.ts`: nhận `initialPassages`; thêm `useOptimistic` + reducer; derive `documents`/`activePassage` từ optimistic list; viết lại `handleDeletePassage` (startTransition → optimistic remove → `deletePassageAction` → reconcile active); viết lại `handleUploadComplete` (optimistic add + setActive + `router.refresh()`).
4. `StudyState`: bỏ field `passages`.
5. `use-study-actions.ts`: thêm param `passages`; đổi 2 guard `state.passages.find` → `passages.find`.
6. `study-workspace-client.tsx`: truyền `passages` (optimistic) vào `useStudyActions`; đảm bảo `initialPassages` là nguồn.
7. `use-upload-submit.ts`: `router.refresh()`; sửa import alias.
8. `pnpm typecheck` → sửa lỗi.

## Success Criteria
- [ ] `deletePassageAction` là server action (`'use server'`), gọi `deletePassage(id, userId)` + `revalidatePath('/study')`.
- [ ] `rg -rn "/api/passages" features/ app/` → 0 (route DELETE đã xoá, không client nào fetch).
- [ ] Xoá passage đang mở → active chuyển sang passage mới nhất còn lại; hết → idle/empty state.
- [ ] `StudyState` không còn `passages`; list derive từ props/optimistic.
- [ ] Upload xong danh sách cập nhật (optimistic + refresh).
- [ ] `pnpm typecheck` sạch.

## Risk Assessment
- **`useOptimistic` phải nằm trong transition** — gọi ngoài `startTransition` sẽ warn/lỗi. Mitigation: bọc mọi `applyOptimistic` trong `startTransition`.
- **`revalidatePath` không đồng bộ với `activePassageId` client** — active trỏ passage đã xoá giữa lúc props chưa về. Mitigation: derive `activePassage` bằng `.find`, fallback most-recent khi null; reconcile ngay trong handler.
- **Guards đọc `state.passages` bị bỏ sót** → artifact retry lỗi. Mitigation: grep `state.passages` sau khi sửa = 0.
- **Độ phức tạp Model A** cao hơn Model B (giữ client-state). User đã chọn Model A (server-authoritative) — giữ quyết định; nếu lúc code thấy churn vượt kỳ vọng, dừng và xác nhận lại với user trước khi đổi hướng.
- **`getUserId()` trong server action** khác context route — đảm bảo `auth-utils.getUserId` chạy được trong action (cùng server runtime, Clerk hỗ trợ). Verify bằng test delete thực tế.
