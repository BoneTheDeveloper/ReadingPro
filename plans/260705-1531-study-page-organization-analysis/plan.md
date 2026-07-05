---
title: Study Page Route to Server Action Conversion
description: ''
status: completed
priority: P2
branch: preview
tags: []
blockedBy: []
blocks: []
created: '2026-07-05T08:45:46.101Z'
createdBy: 'ck:plan'
source: skill
---

# Study Page Route to Server Action Conversion

## Overview

Chuyển 5 route API study page KHÔNG gọi AI/external-service sang Server Action (`'use server'`), giữ nguyên Route API cho route CÓ AI/external-service (upload, upload/text, studio/questions, studio/chat POST, translate). Đồng thời enforce quy ước service-layer có sẵn: mọi route/action đi qua module service/query theo resource, không gọi Prisma `db` trực tiếp trong route handler.

Nguồn: `plans/260705-1531-study-page-organization-analysis/brainstorm-summary.md` (mục "Giải pháp đã chốt").

Không có test suite trong repo (pre-existing, ngoài phạm vi) — verify bằng `pnpm typecheck && pnpm lint` sau mỗi phase.

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Artifacts Service Consolidation](./phase-01-artifacts-service-consolidation.md) | Completed |
| 2 | [Studio Artifacts Actions](./phase-02-studio-artifacts-actions.md) | Completed |
| 3 | [Chat History Action](./phase-03-chat-history-action.md) | Completed |
| 4 | [Vocabulary Action](./phase-04-vocabulary-action.md) | Completed |
| 5 | [Cleanup and Verify](./phase-05-cleanup-and-verify.md) | Completed |

## Dependencies

<!-- Cross-plan dependencies -->
