---
title: "src Feature-Colocation Restructure"
description: "Migrate src/ from layer-based (app/server/contracts/features/components) to feature-colocation (features/{name}/{components,actions,db,schemas,hooks}), phased per feature, no big-bang."
status: pending
priority: P2
branch: "preview"
tags: [refactor, architecture, restructure]
blockedBy: []
blocks: []
created: "2026-07-06T10:53:43.757Z"
createdBy: "ck:plan"
source: skill
---

# src Feature-Colocation Restructure

## Overview

Chuyển `src/` từ kiến trúc layer (`app/`, `server/`, `contracts/`, `features/`, `components/` tách rời) sang colocation theo feature: mỗi feature 1 thư mục gồm `components/actions/db/schemas/hooks`. Dựa trên brainstorm report tại [report.md](./report.md) + addendum passage-domain. 9 feature domain thật: progress, learning-session, dictionary, vocabulary, **passage** (entity trung tâm — nguồn chân lý duy nhất đụng `prisma.passage`), upload (luồng tạo passage), users, **reading** (content-panel + inline translate), studio (quiz/chat/lookup). Study-workspace KHÔNG phải feature — nó là UI glue của trang `/study`, colocate vào route `app/[locale]/(dashboard)/study/{_components,_hooks}` (phase 13). Thực thi phased từng feature, không big-bang. Foundation (types/services/lib) làm trước để các phase feature có chỗ import ổn định.

**Nguyên tắc xuyên suốt mọi phase:**
- Dùng path alias `@/` — sửa import bằng tìm-thay theo path, không sửa tay từng file
- Mỗi phase xong: `pnpm run typecheck && pnpm run lint` trước khi qua phase tiếp
- Route API (`app/api/*/route.ts`) CHỈ xoá/di chuyển khi thực sự không cần route nữa (webhook, external, hoặc file phức tạp như AI/upload) — mặc định giữ nguyên route, chỉ đổi phần logic bên trong sang gọi `features/{name}/db|actions`
- KHÔNG xoá `contracts/` hay `server/` cũ cho tới phase 12 (Cleanup) — dùng re-export tạm để tránh vỡ import giữa các phase

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Foundation: types/](./phase-01-foundation-types.md) | Completed |
| 2 | [Foundation: services/](./phase-02-services.md) | Completed |
| 3 | [Foundation: lib/](./phase-03-lib.md) | Completed |
| 4 | [Progress feature](./phase-04-progress-feature.md) | Completed |
| 5 | [Learning-session feature](./phase-05-learning-session-feature.md) | Completed |
| 6 | [Dictionary feature](./phase-06-dictionary-feature.md) | Completed |
| 7 | [Vocabulary feature](./phase-07-vocabulary-feature.md) | Completed |
| 8 | [Passage entity](./phase-08-passage-entity.md) | Completed |
| 9 | [Upload feature](./phase-09-upload-feature.md) | Completed |
| 10 | [Users feature](./phase-10-users-feature.md) | Completed |
| 11 | [Reading feature (content-panel + inline translate)](./phase-11-reading-feature.md) | Completed |
| 12 | [Studio feature (quiz/chat/lookup)](./phase-12-studio-feature.md) | Completed |
| 13 | [Study page compose (colocate vào route)](./phase-13-study-workspace-compose.md) | Completed |
| 14 | [Cleanup old dirs](./phase-14-cleanup-old-dirs.md) | In Progress |

## Dependencies

Phases strictly sequential (1→14): mỗi phase feature (4-13) phụ thuộc Foundation (1-3) đã xong. Upload (9) phụ thuộc Passage (8) — upload tạo passage qua `features/passage/db`. Reading (11) phụ thuộc Dictionary (6, bản gốc `normalizeDictionaryTerm`) + Passage (8, ownership check). Vocabulary (7) phụ thuộc Phase 11 để xoá bản duplicate `normalizeDictionaryTerm` trong `translation-queries.ts`. Studio (12) phụ thuộc Passage (8) + Reading (11, translate đã tách khỏi studio-panel trước). Study page compose (13) phụ thuộc TẤT CẢ feature trước nó (4-12) vì nó ghép các panel + tách nốt type hub `features/study/shared/types.ts` (**19 consumer**) + colocate glue vào route. Cleanup (14) là phase cuối, chỉ chạy khi 1-13 đã xong và verify pass. **Per-phase re-export verification** (Step 1, Phase 14) phải chạy sau mỗi phase 4-13 — nếu OLD_PATH imports > 0 thì quay lại phase chưa xong.

**Invariant sau plan:** `prisma.passage` chỉ được gọi từ `features/passage/db/` — passage là entity trung tâm, upload/reading/studio/chat đều đi qua nó (hiện đang bị đụng trực tiếp từ 5 file rải 4 chỗ).

Không có cross-plan dependency — 2 plan cũ trong `./plans/` (`260705-1429-passage-server-actions-refactor`, `260705-1531-study-page-organization-analysis`) đều `status: completed`, không overlap block.

## Red Team Review

### Session — 2026-07-06
**Findings:** 11 (11 accepted, 0 rejected)
**Severity breakdown:** 3 Critical, 6 High, 2 Medium

| # | Finding | Severity | Disposition | Applied To |
|---|---------|----------|-------------|------------|
| C1 | Phase 14 grep gate insufficient — misses dynamic imports + misplaced re-exports | Critical | Accept | Phase 14 |
| C2 | Phase 8 createPassage undefined — Phase 9 depends on it but Phase 8 never defines | Critical | Accept | Phase 8, 9 |
| C3 | Phase 13 consumer count 19 not 16 | Critical | Accept | Phase 13 |
| H1 | Phase 7 normalizeDictionaryTerm — wrong import target (vocabulary-items only imports via getOwnedTranslationSource) | High | Accept | Phase 7, 11 |
| H2 | Phase 5 behavioral change scope creep (kept — user confirmed) | High | Accept | Phase 5 |
| H3 | Phase 2/10 auth contradiction — deferred decision resolved to split | High | Accept | Phase 2, 10 |
| H4 | Phase 8 ownership consolidation — select param mismatch across 3 callers | High | Accept | Phase 8 |
| H5 | Phase 5 pointerdown ≠ mousedown (desktop click missed) | High | Accept | Phase 5 |
| H6 | Phase 13 type consumers — missing pre-verify target paths | High | Accept | Phase 13 |
| M1 | iOS Safari scroll passive fires after momentum | Medium | Accept | Phase 5 |
| M2 | Phase 11 translation module cleanup — no per-file consumer check | Medium | Accept | Phase 11 |

### Whole-Plan Consistency Sweep
- Files reread: plan.md, phase-01 through phase-14
- Decision deltas checked: 8 (auth split, createPassage, cleanup verification, consumer count, event list fix, mkdir, normalizeDictionaryTerm coordination, Phase 2/10 contradiction)
- Reconciled stale references: 1 (`pointerdown` in Phase 5 Risk Assessment → `mousedown+touchstart`)
- Unresolved contradictions: 0
