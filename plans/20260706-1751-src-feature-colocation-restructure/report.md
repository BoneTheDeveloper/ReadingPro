# Brainstorm Report: src/ Feature-Colocation Restructure

## Problem statement
Current `src/` split theo layer (`app/`, `server/`, `contracts/`, `features/`, `components/`) — logic 1 tính năng nằm rải 3-4 thư mục. User muốn chuyển sang colocation: mỗi feature 1 thư mục gồm `components/actions/db/schemas/hooks`, giống mẫu Next.js+Clerk+Prisma SaaS starter user cung cấp.

## Current state (scouted)
- 184 ts/tsx file (không tính `generated/`)
- `app/` (39): routing + 24 API route handlers
- `server/` (47): `modules/{ai-chat,dictionary,passage,spaced-repetition,translation,upload,vocabulary}`, `auth/`, `ai/`, `db/`, `lib/`, `http/`, `observability/`, `storage/`
- `contracts/` (16): Zod schema theo domain
- `features/` (50): UI (`hooks/ui/lib/model/api-client`) — KHÔNG chứa server logic
- Clerk + Prisma đã dùng (`server/auth/sync-user.ts`, `app/api/webhooks/clerk/route.ts`, `generated/prisma`)
- `src/proxy.ts` đã đóng vai trò middleware (Clerk auth + next-intl locale routing) — không cần thêm `middleware.ts`
- Không có `data/env.ts` validate env — gap có sẵn từ trước, ngoài phạm vi restructure này

## Requirements (từ user)
- **Scope**: migrate toàn bộ 9 feature hiện có, KHÔNG chỉ áp dụng cho code mới
- **Contracts**: bỏ `contracts/` — schema dùng chung thật sự (>1 feature) → `src/types/`; schema riêng feature → `features/{name}/schemas/`
- **API routes**: giữ nguyên `app/api/*/route.ts` cho case cần thiết (webhook Clerk, endpoint public/external); KHÔNG ép chuyển hết sang Server Actions — chỉ route nội bộ mới cân nhắc `actions/` khi refactor
- **Execution**: phased theo từng feature, KHÔNG big-bang

## Target structure
```
src/
├── app/                         # routing only
│   └── api/                     # chỉ giữ route thật cần (webhook, public/external)
├── features/{name}/
│   ├── components/  actions/  db/  schemas/  hooks/
├── components/                  # shared UI (ui/, layout/, provider/, system/)
├── hooks/                        # shared cross-feature hooks (mới)
├── lib/                          # prisma.ts, utils.ts, constants/, http/api-request.ts
├── services/                     # cross-cutting: clerk.ts, ai/, storage.ts, logger.ts
├── types/                        # cefr.ts, api-response-schema.ts
└── data/env.ts                   # MỚI, chưa có
```

## Feature boundary mapping
| Feature mới | Gộp từ | Ghi chú |
|---|---|---|
| `dictionary` | `features/dictionary/*`, `server/modules/dictionary/*`, `contracts/dictionary/*`, `app/api/dictionary/*` | |
| `vocabulary` | `features/vocabulary/*`, `server/modules/vocabulary/*`, `contracts/vocabulary/*`, `server/modules/spaced-repetition/*`, `app/api/vocabulary/*` | spaced-repetition chỉ 1 consumer (vocabulary) |
| `upload` | `features/source-panel/*`, `server/modules/upload/*`, `contracts/upload/*`, `app/api/upload/*`, `app/api/local-blob/*` | |
| `studio` | `features/studio-panel/*`, `server/modules/passage/*`, `server/modules/ai-chat/*`, `server/modules/translation/*`, `contracts/study/*`, `contracts/translation/*`, `app/api/studio/*`, `app/api/translate/*`, `server/db/translation-queries.ts` | translation gộp vào studio (chỉ 1 consumer, YAGNI) |
| `learning-session` | `features/learning-session/*`, `server/db/learning-session-queries.ts`, `contracts/learning-session/*`, `app/api/learning-session/*` | |
| `progress` | `features/progress/*`, `server/db/passage-queries.ts`, `app/api/progress/*` | |
| `study-workspace` | giữ nguyên, compose layer | `content-panel` gộp vào làm `components/content-panel/` |
| `users` | `server/auth/*`, `app/api/webhooks/clerk/route.ts` | |

Cross-cutting → `services/`:
- `server/ai/*` → `services/ai/` (dùng bởi upload, passage, ai-chat, translation)
- `server/storage/blob-storage.ts` → `services/storage.ts` (dùng bởi upload + `app/api/local-blob`)
- `server/observability/logger.ts` → `services/logger.ts` (33 nơi dùng, giữ path ổn định qua alias)

## Finding: dead/misplaced code (not part of restructure scope, flag for cleanup)
`server/db/translation-queries.ts` chỉ chứa logic translation cache/history, NHƯNG cũng export `normalizeDictionaryTerm` — hàm này trùng chức năng với `contracts/dictionary/normalize-dictionary-term.ts` đã có sẵn. `server/modules/vocabulary/items/vocabulary-items.repository.ts` đang import bản trùng lặp này thay vì bản dictionary gốc. Cần xoá bản trùng và trỏ lại import khi migrate `vocabulary` + `studio`.

## Execution order (phased, ít phụ thuộc chéo trước)
1. Foundation: tạo `types/`, `services/`, dọn `lib/` — KHÔNG xoá `contracts/`/`server/` cũ ngay, dùng re-export tạm để không vỡ import
2. `progress` (ít phụ thuộc nhất)
3. `learning-session`
4. `dictionary`
5. `vocabulary` (kèm sửa finding `normalizeDictionaryTerm` trùng lặp + gộp spaced-repetition)
6. `upload`
7. `users`
8. `studio` (phức tạp nhất: ai-chat + translation + passage)
9. `study-workspace` (compose layer, cuối cùng vì phụ thuộc tất cả feature UI trên)
10. Dọn dẹp: xoá `contracts/`, `server/` cũ, xoá re-export tạm, chạy `pnpm typecheck && pnpm lint && pnpm test`

Mỗi phase: migrate file → sửa import → `pnpm typecheck` → verify UI liên quan (dev server) → commit riêng.

## Risks
- Import path thay đổi trên diện rộng (~184 file) — dùng codemod/tìm-thay theo path alias thay vì sửa tay từng file
- `services/logger.ts` bị 33 nơi dùng — đổi path này rủi ro cao nhất, nên làm sớm + giữ re-export tạm ở `server/observability/logger.ts` trỏ sang path mới cho tới khi tất cả import xong
- `studio` phase gộp 3 module cũ (passage, ai-chat, translation) — nhiều logic nhất, dễ sót edge case, nên làm cuối khi đã quen pattern

## Next steps
Chờ user chọn `/ck:plan` mode để lập kế hoạch chi tiết từng phase (phase-01 → phase-10 theo thứ tự trên).

## Addendum: Passage domain re-analysis (2026-07-06, sau brainstorm round 2)

User yêu cầu chia rõ hơn giữa các chức năng quanh passage (entity trung tâm của study page). Scout sâu hơn, phát hiện + quyết định:

### Facts mới
- `prisma.passage` bị đụng trực tiếp từ 5 file rải 4 chỗ: `passage-queries.ts`, `content-analysis.repository.ts` (upload TẠO passage), `passage-study.repository.ts` (studio), `chat-service.ts`, `translation-queries.ts` — ownership check trùng 3 bản
- `features/study/shared/types.ts` KHÔNG phải tàn dư — là type hub 16 consumer (PassageData, QuestionData, StudyState, TranslationSelection...)
- `translation-popup.tsx` nằm trong studio-panel nhưng render bởi study-workspace, trigger từ content-panel selection — sai chỗ
- `sources-panel.tsx` là UI danh sách passage (không phải upload UI)
- Progress dùng `server/db/quiz/quiz-review.ts` (getUserProgress), KHÔNG dùng passage-queries — mapping ban đầu SAI, đã đính chính phase-04
- Dead code: `getNewCards` (passage-queries), `quick-selection-scope.ts` (0 consumer)

### Quyết định (user chốt cả 3)
1. **Passage là entity riêng** — `features/passage/` là nguồn chân lý duy nhất đụng `prisma.passage`; upload/reading/studio import từ đây
2. **Inline translate thuộc reading** — feature mới `features/reading/` (content-panel + translate popup + inline-translate service/cache); studio không ôm translate nữa
3. **Type hub tách theo chủ sở hữu** — passage types → passage, translation types → reading, question/artifact types → studio, StudyState → workspace

### Plan cập nhật: 12 → 14 phases
Thêm phase 8 (Passage entity), phase 11 (Reading); studio slim lại thành quiz/chat/lookup; sources-panel về passage; saveVocabularyAction về vocabulary; deletePassageAction về passage. Invariant verify ở cleanup: grep `prisma.passage` chỉ còn trong `features/passage/db/`.

### Quyết định round 3 (user chốt)
**Study-workspace KHÔNG phải feature** — nó là UI glue của đúng 1 trang `/study` (compose 4 panel + state điều phối + layout), không có DB/schema/business logic. Colocate vào route: `app/[locale]/(dashboard)/study/{_components,_hooks,_types.ts}` (Next.js private folders). Sau plan, `features/` chỉ còn 9 domain thật; page tự compose features — khớp template gốc user đưa.

### Quyết định round 4 (user chốt): learning-session trigger
Vấn đề: heartbeat nhét trong `DashboardSidebar` + timer 60s mù → coupling thiếu tự nhiên + đếm lố (mở tab bỏ đi vẫn ping vì reset cutoff idle server). LÀM RÕ: scope app-wide là ĐÚNG (cả app để học, learning-session = thời gian dùng app; user đổi tên study→learning-session chính để tránh conflict). Chỉ sửa placement + trigger:
- Tách khỏi sidebar → `features/learning-session/ui/learning-session-tracker.tsx` (render null), mount ở `(dashboard)/layout.tsx`
- Event-driven throttled: ping khi mount + sự kiện thật (pointerdown/keydown/scroll/visibility→visible/route-change), throttle 60s, KHÔNG setInterval mù. Idle → ngừng ping → server đóng session (cutoff 10p sẵn có)
- Fold vào phase 5 (behavioral change, không chỉ move file). DB `ensureActiveSession` giữ nguyên (đã idempotent + advisory lock + idle cutoff)

## Unresolved questions
- `data/env.ts` validate env — user quyết định tách task riêng, không thuộc phạm vi restructure này
