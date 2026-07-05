# Study Page Organization Analysis — Relation Maps

Scope: chỉ phân tích hiện trạng, KHÔNG đề xuất sửa, KHÔNG tạo plan. Loại `learning-session` (không thuộc study page). Vocabulary/dictionary tách riêng, chỉ ghi quan hệ gọi-sang.

Ký hiệu Type: `RSC query` = server component đọc DB lúc render | `Server Action` = `'use server'` mutation | `Route API` = REST endpoint (`app/api/**`) | `Client fetch` = gọi HTTP thẳng từ component/hook client | `Pure UI` = không tự gọi API, nhận data qua props.

## 1. Workspace (controller tổng, điều phối 3 panel)

| File | Type | Gọi tới | Ghi chú |
|---|---|---|---|
| `app/[locale]/(dashboard)/study/page.tsx` | RSC query | `server/db/passage-queries.getUserPassages` | Nguồn sự thật ban đầu cho `initialPassages`, `dynamic="force-dynamic"` |
| `features/study-workspace/actions.ts` (`deletePassageAction`) | Server Action | `server/db/passage-queries.deletePassage` + `revalidatePath("/study")` | Server action duy nhất trong toàn bộ study page |
| `features/study-workspace/hooks/use-study-workspace-state.ts` | Client fetch (gián tiếp qua action) | `deletePassageAction` | `useOptimistic` cho add/remove passage, `router.refresh()` sau upload |
| `features/study-workspace/hooks/use-study-actions.ts` | Client fetch (qua api-client) | `studio-questions-client.generateStudioQuestions`, `studio-artifacts-client.getArtifactDetail` | Chỉ điều phối state, không tự fetch thô |
| `features/study-workspace/hooks/use-study-panel-layout.ts` | Pure UI | — | Resize/collapse 3 panel, không liên quan data |
| `features/study-workspace/ui/study-workspace-client.tsx` | **Client fetch (thô, inline)** | `fetch("/api/translate")`, `fetch("/api/vocabulary")` | **Bất thường**: 1 UI component tự fetch thẳng 2 route thuộc domain khác (dịch/từ vựng), không qua hook hay api-client riêng — khác pattern với mọi nơi khác trong workspace |

## 2. Source Panel (upload + danh sách nguồn)

| File | Type | Gọi tới | Ghi chú |
|---|---|---|---|
| `features/source-panel/ui/sources-panel.tsx` | Pure UI | — | Nhận `documents`, `onDelete`, `onSelect` qua props |
| `features/source-panel/ui/upload-modal.tsx` | Client fetch (qua api-client) | `upload-client.uploadFile`, `upload-client.uploadText` | Modal trong `/study` |
| `features/source-panel/ui/upload/upload-page-client.tsx` | Client fetch (qua hook) | `hooks/use-upload-submit` | Trang `/upload` độc lập, `router.push('/study')` sau khi xong |
| `features/source-panel/hooks/use-upload-submit.ts` | Client fetch (qua api-client) | `upload-client.uploadFile`, `upload-client.uploadText` | Chỉ dùng bởi `upload-page-client.tsx` |
| `features/source-panel/ui/upload/upload-zone.tsx`, `text-input-area.tsx`, `processing-page-client.tsx` | Pure UI | — | Không tự fetch |
| `features/source-panel/api-client/upload-client.ts` | api-client wrapper | `POST /api/upload` (Route API), `POST /api/upload/text` (Route API) | Route API hợp lý: xử lý file/AI-analysis phức tạp |
| `app/api/upload/route.ts` | Route API | `server/modules/upload/upload-workflow.processFileUpload` | |
| `app/api/upload/text/route.ts` | Route API | `server/modules/upload/content-analysis/content-analysis.service.analyzeAndPersistContent` | |

## 3. Content Panel (khung đọc)

| File | Type | Gọi tới | Ghi chú |
|---|---|---|---|
| `features/content-panel/ui/content-panel.tsx` | Pure UI | — | Toggle Original/Simplified dựa trên field có sẵn trong `passage`, không tự fetch (client hết cũ đã xoá ở phase trước) |
| `features/content-panel/hooks/use-scroll-progress.ts`, `hooks/selection-utils.ts`, `lib/cefr-style.ts` | Pure UI/logic | — | Không liên quan data-fetch |

## 4. Studio Panel (artifacts: chat / quiz / translate-popup / lookup)

| File | Type | Gọi tới | Ghi chú |
|---|---|---|---|
| `features/studio-panel/ui/studio-panel.tsx` | Pure UI (điều phối con) | — | |
| `features/studio-panel/ui/studio/chat/chat-panel.tsx` | **Client fetch (thô, inline) + `useChat`** | `POST /api/studio/chat` (qua `useChat`/`DefaultChatTransport`), `GET /api/studio/chat` (raw `fetch` trong `useEffect`) | **Bất nhất pattern**: GET lịch sử tự fetch thô, không qua api-client như quiz/questions |
| `features/studio-panel/ui/studio/quiz/quiz-results.tsx` | Client fetch (qua api-client) | `studio-artifacts-client.recordQuizResult`, `resetQuizResult` | |
| `features/studio-panel/api-client/studio-artifacts-client.ts` | api-client wrapper | `GET /api/studio/artifacts/[id]`, `POST/DELETE /api/studio/artifacts/[id]/quiz-result` (Route API) | |
| `features/studio-panel/api-client/studio-questions-client.ts` | api-client wrapper | `POST /api/studio/questions` (Route API) | Dùng `postJson` chuẩn hoá timeout/parse |
| `features/studio-panel/hooks/use-study-artifacts.ts` | Client fetch (raw) | `GET /api/studio/artifacts?passageId=...` | Fetch thô trong hook (không qua api-client wrapper riêng, khác `studio-artifacts-client.ts`) |
| `features/studio-panel/ui/studio/lookup/lookup-panel.tsx`, `studio/translate/translation-popup.tsx` | Pure UI | — | Nhận `selection`, `quickTranslation` qua props; logic gọi API dịch/lưu từ vựng **không nằm ở đây** mà ở `study-workspace-client.tsx` (xem map 1) |
| `app/api/studio/artifacts/route.ts` | Route API | `server/modules/passage/studio-artifacts-service.fetchStudioArtifacts` | |
| `app/api/studio/artifacts/[id]/route.ts` | Route API | `server/lib/db` (Prisma trực tiếp) | Không qua service layer riêng như các route khác |
| `app/api/studio/artifacts/[id]/quiz-result/route.ts` | Route API | `server/modules/passage/studio-artifacts-service.recordQuizResult/resetQuizResult` | |
| `app/api/studio/questions/route.ts` | Route API | `server/modules/passage/passage-study.service.generateQuestionsForPassage` | AI generation — hợp lý giữ route |
| `app/api/studio/chat/route.ts` | Route API | `server/modules/ai-chat/chat-service.*` | AI streaming — hợp lý giữ route |

## Cụm ngoài phạm vi (chỉ ghi quan hệ, không map chi tiết)

| Cụm | Quan hệ với study page |
|---|---|
| Vocabulary/Dictionary (`app/api/vocabulary/**`, nhiều route: list/sets/stats/review...) | `study-workspace-client.tsx` gọi thẳng `POST /api/vocabulary` để lưu từ đã tra; UI hiển thị (`lookup-panel.tsx`) thuộc `studio-panel` nhưng logic lưu nằm ở workspace, không phải feature vocabulary tự quản lý phần này |
| Translate service (`app/api/translate`) | `study-workspace-client.tsx` gọi thẳng để dịch nhanh đoạn chọn; không có api-client wrapper riêng |

## Bất nhất pattern phát hiện (liệt kê, không đề xuất sửa)

1. `study-workspace-client.tsx` (UI component) tự `fetch` thô 2 route ngoài domain (`/api/translate`, `/api/vocabulary`) — mọi nơi khác đều qua hook hoặc api-client.
2. `chat-panel.tsx`: POST qua `useChat`, nhưng GET lịch sử lại tự fetch thô trong `useEffect` — không đi qua api-client như quiz/questions.
3. `use-study-artifacts.ts` (hook): tự fetch thô `GET /api/studio/artifacts` — trong khi `studio-artifacts-client.ts` (cùng feature, khác file) đã có wrapper cho `GET /api/studio/artifacts/[id]` (khác endpoint, số ít vs số nhiều) — 2 file api riêng cho 2 dạng truy vấn cùng resource.
4. `app/api/studio/artifacts/[id]/route.ts` gọi Prisma (`db`) trực tiếp, không qua service layer như các route khác trong cùng cụm (`studio-artifacts-service`).
5. Server Action chỉ có 1 cái (`deletePassageAction`) — mọi mutation/query khác đều là Route API, kể cả những cái đơn giản như lưu vocabulary/quiz-result (có thể đơn giản hoá được nhưng đây là nhận xét, không phải đề xuất).

## Giải pháp đã chốt (approved — sẵn sàng /ck:plan)

**Hướng A**: enforce quy ước service-layer có sẵn — mọi route/action đi qua 1 module service/query duy nhất theo resource, không được gọi Prisma (`db`) trực tiếp trong route handler / action.

**Quy tắc phân loại route (đã chốt)**: route KHÔNG gọi AI/external-service → chuyển thành Server Action (đọc lẫn ghi, kể cả đọc theo tương tác client dùng "Server Function" `'use server'`); route CÓ gọi AI/external-service → giữ nguyên Route API.

| Route | AI/external? | Quyết định | Note |
|---|---|---|---|
| `POST /api/upload` | Có | Giữ Route API | |
| `POST /api/upload/text` | Có | Giữ Route API | |
| `POST /api/studio/questions` | Có | Giữ Route API | |
| `POST /api/studio/chat` | Có (streaming) | Giữ Route API | Bắt buộc vì cần stream response |
| `GET /api/studio/chat` (history) | Không | → Server Action | Gọi client-side khi mount chat panel |
| `GET /api/studio/artifacts` (list) | Không | → Server Action | Lazy-load theo passage chọn |
| `GET /api/studio/artifacts/[id]` (detail) | Không | → Server Action | Đồng thời fix vi phạm #4 (route đang hit Prisma trực tiếp) |
| `POST/DELETE /api/studio/artifacts/[id]/quiz-result` | Không | → Server Action | |
| `POST /api/vocabulary` | Không | → Server Action | Tính vào đợt này dù thuộc feature vocabulary khác, cùng quy tắc |
| `POST /api/translate` | Có (AI dịch) | Giữ Route API | |
| `DELETE /api/passages/[id]` | Không | Đã là Server Action | Xong ở phase trước |

**Không nằm trong bảng trên (giữ nguyên vì đã đúng chuẩn)**: RSC query `page.tsx` (đọc lúc load trang), toàn bộ source-panel upload flow (đã Route API hợp lý vì có AI).

**Next step đã chọn**: chuyển sang `/ck:plan` để lập kế hoạch chi tiết từng route cần convert, thứ tự thực hiện, xử lý các api-client/hook client hiện đang gọi các route sẽ bị xoá.
