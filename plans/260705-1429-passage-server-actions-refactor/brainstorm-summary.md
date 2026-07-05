# Brainstorm — Passage: chuyển sang Server Action + dọn tổ chức source/content panel

Ngày: 2026-07-05 · Scope: passage (upload / hiển thị / query / delete) + source-panel + content-panel

## 1. Problem statement

API passage hiện đi qua route handler + client fetch. User muốn:
- Chuyển các mutation passage "đơn giản" sang **Server Action**.
- Chỉ giữ **route API cho function phức tạp** (upload).
- Tập trung: upload passage, hiển thị, query.
- Trả lời: có nên gộp source-panel + content-panel thành 1 cụm.

## 2. Scout findings (hiện trạng)

- Repo **chưa có Server Action nào** — mọi mutation qua `app/api/**/route.ts`.
- **Display/query đã là server-side**: `study/page.tsx` (RSC) gọi thẳng `getUserPassages(userId)` → `initialPassages`. Không cần đụng.
- **Business logic đã tách sạch** trong `server/modules/**` + `server/db/passage-queries.ts`. Route/Action chỉ là lớp vỏ mỏng → tái dùng service y hệt.
- **Bug/code chết phát hiện**:
  - `content-panel/api-client/passages-client.ts` gọi `/api/study/passages*` nhưng route thật ở `/api/passages*`, không có rewrite → **404**. `createPassage` (chỉ `upload-modal` dùng) đang hỏng; path text hoạt động thật là `/api/upload/text`.
  - Import trộn 2 kiểu: `@/features/source-panel/...` (phẳng) và `@/features/study/source-panel/...` (namespace) — thư mục thật chỉ có `features/study/shared` → alias `study/source-panel` nhiều khả năng hỏng.

## 3. Quyết định đã chốt

| # | Quyết định | Lý do |
|---|---|---|
| D1 | `/api/upload` (file) + `/api/upload/text` **GIỮ route** | multipart/blob/PDF/AI, body lớn — "function phức tạp" |
| D2 | **Xoá `simplify` end-to-end** (route + service + contract + `use-study-actions.handleSimplify` + nút/modal trong content-panel + i18n) | User xác nhận không cần |
| D3 | **Xoá code chết**: `/api/passages` POST + `createPassage` + `passages-client.ts` | 404/trùng lặp; modal trỏ lại `/api/upload/text` |
| D4 | `/api/passages/[id]` DELETE **→ Server Action** | mutation "đơn giản" thật sự duy nhất còn lại |
| D5 | Display/query **giữ RSC** | đã server-side |
| D6 | Data-flow: **A — Server-authoritative + `useOptimistic`** | 1 nguồn sự thật (DB), xoá client-state nặng; delete tức thì |
| D7 | Tổ chức: **KHÔNG dựng cấu trúc mới**. Giữ slice phẳng hiện tại. Delete action đặt trong **`features/study-workspace/actions.ts`** (workspace vốn sở hữu `onDelete`). **Không** tạo `shared/actions`, **không** move `types.ts` (17 import), **không** nhóm `features/study/` | Verified: workspace = 1017 dòng controller thật (không phải glue); `sources-panel` đã nhận `onDelete` qua prop → coupling đúng chiều sẵn; delete xuyên panel nên thuộc workspace |

## 4. Kiến trúc mục tiêu

### 4.1 Data-flow (Model A)
- **Delete**: `deletePassage(passageId)` (`'use server'`) → gọi `deletePassage()` (db) → `revalidatePath('/study')`. UI bọc `useOptimistic` để xoá hàng tức thì; nếu action lỗi, optimistic tự revert.
- **Upload** (giữ route): sau khi route trả `success` → client `router.refresh()` để RSC kéo lại list.
- **List**: luôn từ RSC (`getUserPassages`), **bỏ `passages` khỏi `useState`**.
- **Client chỉ giữ view-state**: `activePassageId`, `artifactsByPassageId`, `viewingArtifactByPassageId`, `artifactDetailById`, `uploadModalOpen`.

### 4.2 Behavior: active passage bị xoá (side-effect render content-panel)
- Trigger: nút xoá trong `sources-panel` row.
- Reconcile ở workspace: nếu `activePassageId` vừa bị xoá → chọn passage mới nhất còn lại; nếu hết → `status: "idle"`, content-panel hiện empty state.
- (Default đề xuất — điều chỉnh được nếu muốn hành vi khác.)

### 4.3 Tổ chức thư mục (grouping, KHÔNG merge UI)
```
features/study/
├── source-panel/     upload UI + sources list (trigger delete)
├── content-panel/    reading view (nhận side-effect khi active bị xoá)
├── workspace/        orchestrator (điều phối delete + reconcile active)
├── shared/
│   ├── types.ts
│   └── actions/passage-actions.ts   'use server' → deletePassage
```
- Thống nhất **1 kiểu import** (namespace `@/features/study/*`), sửa hết alias lệch.
- `passages-client.ts` bị xoá; `upload-client.ts` giữ (fetch route upload).

## 5. Bảng file — hành động

| File | Hành động |
|---|---|
| `app/api/passages/[id]/simplify/route.ts` | **Xoá** |
| `server/modules/study/passage/passage-study.service.ts` (simplify) | **Xoá** (nếu không còn consumer khác) |
| `app/api/passages/route.ts` (POST create) | **Xoá** |
| `app/api/passages/[id]/route.ts` (DELETE) | **Xoá** (thay bằng action) |
| `server/modules/upload/passage-create/passage-create.service.ts` | **Xoá** nếu chỉ route POST dùng |
| `features/content-panel/api-client/passages-client.ts` | **Xoá** |
| `contracts/study/passage-schema.ts` | Bỏ create/simplify schema thừa |
| `.../shared/actions/passage-actions.ts` | **Tạo** — `'use server' deletePassage` + `revalidatePath` |
| `features/study-workspace/hooks/use-study-workspace-state.ts` | `passages` từ props; `useOptimistic` cho delete; reconcile active |
| `features/study-workspace/hooks/use-study-actions.ts` | Bỏ `handleSimplify`; guard đọc passages từ props |
| `features/study-workspace/ui/study-workspace-client.tsx` | Nhận `initialPassages` làm nguồn list; bỏ nhánh simplify |
| `features/content-panel/ui/content-panel.tsx` | Bỏ nút/modal simplify |
| `features/source-panel/ui/upload-modal.tsx` | Bỏ `createPassage`; text→`/api/upload/text`; upload xong `router.refresh()` |
| `features/source-panel/hooks/use-upload-submit.ts` | Sửa alias; upload xong `router.refresh()` (thay `router.push`) |
| `app/[locale]/(dashboard)/study/page.tsx` | Giữ (RSC query) — không đổi |
| i18n `messages/*` | Bỏ key `simplify*` |

**Giữ nguyên**: `server/modules/upload/*`, `server/db/passage-queries.ts` (getUserPassages, deletePassage, getPassageWithQuestions), `contracts/upload/*`, `upload-client.ts`.

## 6. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| `passage-study.service` / `passage-create.service` còn consumer khác | Grep xác nhận trước khi xoá; nếu còn thì giữ, chỉ bỏ đường vào |
| Chuyển `passages` sang props phá logic artifacts đọc `state.passages` | Đổi guard đọc từ props; test switch passage giữa lúc gen quiz |
| `revalidatePath` + view-state client lệch (active bị xoá) | Reconcile active ở workspace (mục 4.2) |
| Server Action body limit / auth | Delete chỉ nhận `id`; dùng `getUserId()` trong action như route cũ |

## 7. Success criteria

- Không còn route `/api/passages*` và `/simplify`; `deletePassage` chạy qua server action.
- Upload (file + text) vẫn qua route; sau upload list tự cập nhật.
- Xoá passage: hàng biến mất tức thì; nếu là passage đang mở → content-panel chuyển active hợp lệ.
- Không còn import `/api/study/*` (404) và alias `features/study/source-panel` hỏng.
- `pnpm typecheck` + `pnpm lint` + `pnpm test` pass.

## 8. Open questions

- `passage-study.service.ts` và `passage-create.service.ts` có consumer nào khác ngoài route sắp xoá không? (xác nhận bằng grep ở bước plan trước khi xoá)
- Hành vi khi xoá passage đang mở: chọn "mới nhất còn lại" đã ổn chưa, hay muốn giữ vị trí kế cận trong list?
