# Feature Slice Internal Format Standardization

Brainstorm report. Scope: chuẩn hóa format nội bộ (cấu trúc thư mục con) của từng
`src/features/<feature>/` cho nhất quán. KHÔNG đụng tới vấn đề `study/` type-hub hay việc
rename `studio-panel` — đó thuộc plan cũ
`plans/20260706-1751-src-feature-colocation-restructure/` (phase 13-14 đang lệch giữa status
ghi "complete" và thực tế trên disk — để nguyên, không xử lý trong report này theo quyết định
người dùng).

## Template chuẩn (strict — luôn dùng thư mục con, không xét số lượng file)

```
features/<feature>/
├── schemas/*.schema.ts       # LUÔN trong schemas/, kể cả chỉ 1 file
├── db/*-repository.ts        # LUÔN trong db/, CHỈ Prisma/SQL access, không chứa service
├── services/*-service.ts     # LUÔN trong services/, tách biệt khỏi db/
├── <feature>-client.ts       # Fetch wrapper, tên khớp feature, ở root
├── hooks/use-*.ts
├── lib/
└── ui/                       # React components — không dùng "components/"
```

Quy tắc strict: ranh giới layer rõ ràng quan trọng hơn việc gọn file cho slice nhỏ. Mọi feature
có ≥1 file loại nào thì loại đó phải nằm trong thư mục tương ứng (`schemas/`, `db/`, `services/`),
không giữ flat ở root.

## Ma trận lệch chuẩn

### Nhóm 1 — schema chưa nằm trong `schemas/`

| Feature | File hiện tại | Sửa |
|---|---|---|
| dictionary | `dictionary.schema.ts` | → `schemas/dictionary.schema.ts` |
| vocabulary | `vocabulary.schema.ts` | → `schemas/vocabulary.schema.ts` |
| reading | `translation.schema.ts` | → `schemas/translation.schema.ts` |
| learning-session | `learning-session.schema.ts` | → `schemas/learning-session.schema.ts` |
| upload | `upload.schema.ts` | → `schemas/upload.schema.ts` |

### Nhóm 2 — service lẫn trong `db/`, chưa tách `services/`

| Feature | File hiện tại | Sửa |
|---|---|---|
| vocabulary | `db/vocabulary-items.service.ts`, `db/sets/vocabulary-sets.service.ts` | → `services/vocabulary-items.service.ts`, `services/sets/vocabulary-sets.service.ts` |
| reading | `db/inline-translate.service.ts` | → `services/inline-translate.service.ts` |
| upload | `db/content-analysis/content-analysis.service.ts` | → `services/content-analysis.service.ts` |
| passage | `db/passage-study.service.ts`, `db/studio-artifacts-service.ts` | → `services/passage-study.service.ts`, `services/studio-artifacts.service.ts` |
| ai-chat | `chat-service.ts` (root, không có `services/`) | → `services/chat-service.ts` |

### Nhóm 3 — db file chưa nằm trong `db/`

| Feature | File hiện tại | Sửa |
|---|---|---|
| learning-session | `learning-session-queries.ts` (root) | → `db/learning-session-queries.ts` |

### Nhóm 4 — dùng `components/` thay vì `ui/`

| Feature | Hiện tại | Sửa |
|---|---|---|
| progress | `components/progress-dashboard.tsx` | → `ui/progress-dashboard.tsx` |
| reading | `components/content-panel.tsx` | → `ui/content-panel.tsx` |

### Nhóm 5 — helper chưa vào `lib/`

| Feature | Hiện tại | Sửa |
|---|---|---|
| ai-chat | `chat-utils.ts` (root) | → `lib/chat-utils.ts` |

## Không cần sửa

- `studio-panel` đã có `schemas/` (2 file: `chat.schema.ts`, `study.schema.ts`) → đúng chuẩn.
- `progress/hooks/progress-client.ts` vị trí sai chuẩn (client nên ở root) — để riêng nếu muốn
  xử lý sau, không nằm trong 5 nhóm chốt.
- Tên client wrapper lệch (`upload-client.ts`, `studio-questions-client.ts`) — để riêng nếu muốn
  xử lý sau, không nằm trong 5 nhóm chốt.
- `study/` type-hub, `studio-panel` rename, `source-panel`/`ai-chat` domain boundary — thuộc plan
  cũ, không xử lý ở đây theo quyết định người dùng.

## Next steps

Report-only, dừng ở đây theo yêu cầu. Khi muốn thực thi, tạo `/ck:plan` riêng cho 5 nhóm trên
(10 file di chuyển, không đổi logic — chỉ move + sửa import).
