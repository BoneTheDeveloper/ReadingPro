---
phase: 9
title: "Upload feature"
status: pending
priority: P2
effort: "3h"
dependencies: [1, 2, 3, 8]
---

# Phase 9: Upload feature

## Overview

Gộp phần UPLOAD của `features/source-panel/*` (upload-modal, upload-zone, processing page — KHÔNG gồm `sources-panel.tsx` vì đó là UI danh sách passage, đã về `features/passage/` ở phase 8), `server/modules/upload/*` (bao gồm `content-analysis/`), `contracts/upload/*`, `app/api/upload/*`, `app/api/local-blob/*` vào `features/upload/{components,db,schemas,hooks}`. Upload là luồng TẠO passage — phần ghi `prisma.passage` trong `content-analysis.repository.ts` chuyển sang gọi `createPassage`/`updatePassageAnalysis` từ `features/passage/db/passage-write.ts` (đã có ở Phase 8).

## Requirements

- Functional: upload file, upload text, content-analysis (AI phân tích + gán CEFR), xem qua local-blob route đều hoạt động y hệt
- Non-functional: 3 route (`upload`, `upload/text`, `local-blob`) GIỮ NGUYÊN là route (AI/external service + streaming file); sau phase này `prisma.passage` KHÔNG còn bị gọi trực tiếp từ code upload — mọi thao tác passage đi qua `features/passage/db/`

## Architecture

```
features/upload/
├── components/    ← upload-modal.tsx, upload/{processing-page-client, text-input-area, upload-page-client, upload-zone}.tsx
├── db/             ← upload-workflow.ts, content-analysis/* (phần ghi passage tách sang features/passage/db/)
├── schemas/        ← upload-response-schema.ts, upload-validation.ts
└── hooks/          ← use-upload-submit.ts, upload-client.ts (gộp từ api-client/)
```
Dependencies: `services/storage.ts`, `services/ai/` (phase 2), `features/passage/db/` (phase 8) — import, KHÔNG copy vào.

## Related Code Files

- Create: cấu trúc `features/upload/{components,db,schemas,hooks}` đầy đủ
- Modify: `app/api/upload/route.ts`, `app/api/upload/text/route.ts`, `app/api/local-blob/[pathname]/route.ts` (đổi import), `features/study-workspace/ui/study-workspace-client.tsx` (import upload-modal path mới)
- Delete: `src/contracts/upload/`, `src/server/modules/upload/`, `src/features/source-panel/`

## Implementation Steps

1. Đọc toàn bộ file nguồn: `features/source-panel/*` (phần còn lại), `server/modules/upload/*` kể cả `content-analysis/`, `contracts/upload/*`
2. Tách thao tác `prisma.passage` trong `content-analysis.repository.ts` → gọi `createPassage`/`updatePassageAnalysis` từ `features/passage/db/passage-write.ts` (Phase 8 đã tạo); phần phân tích AI thuần giữ trong `features/upload/db/`
3. Tạo `features/upload/` với cấu trúc mới
4. Sửa 3 route trỏ import mới, sửa import upload-modal trong workspace client
5. Xoá `contracts/upload/`, `server/modules/upload/`, `features/source-panel/`
6. `pnpm run typecheck && pnpm run lint`
7. Test thủ công: upload file thật, upload text, xem processing page hiển thị kết quả phân tích, passage mới xuất hiện trong danh sách

## Success Criteria

- [ ] `features/upload/` tồn tại, `features/source-panel/` đã xoá hoàn toàn
- [ ] `contracts/upload/`, `server/modules/upload/` đã xoá
- [ ] Code upload không còn gọi `prisma.passage` trực tiếp (grep verify)
- [ ] 3 route upload/local-blob hoạt động đúng
- [ ] `pnpm run typecheck && pnpm run lint` pass
- [ ] Test thủ công upload file + text pass, passage mới hiện trong sources list

## Risk Assessment

Rủi ro trung bình — logic AI (content-analysis) + storage + tách ranh giới passage-write. Mitigation: chạy sau phase 8 để passage db sẵn sàng; giữ nguyên route tránh đổi luồng streaming file; so sánh kỹ shape dữ liệu ghi passage trước/sau tách.
