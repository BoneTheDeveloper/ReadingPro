---
phase: 1
title: "Foundation: types/"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Foundation: types/

## Overview

Tạo `src/types/` chứa schema/type dùng chung THẬT SỰ nhiều feature (`cefr.ts`). Đây là bước đầu của foundation, không đụng route/feature nào — an toàn, ít rủi ro.

## Requirements

- Functional: `src/types/cefr.ts` tồn tại, export giống hệt bản gốc
- Non-functional: import cũ (`@/contracts/domain/cefr`) KHÔNG được vỡ trong lúc các phase sau chưa migrate hết

## Architecture

- `src/types/cefr.ts` ← copy nội dung từ `src/contracts/domain/cefr.ts`
- File gốc trong `contracts/domain/` chuyển thành **re-export** trỏ sang `types/` (`export * from "@/types/cefr"`) để giữ tương thích ngược cho các phase chưa migrate

## Related Code Files

- Create: `src/types/cefr.ts`
- Modify: `src/contracts/domain/cefr.ts` (đổi thành re-export)

## Implementation Steps

1. Đọc nội dung `src/contracts/domain/cefr.ts`
2. Tạo `src/types/cefr.ts` với nội dung y hệt
3. Thay nội dung file gốc trong `contracts/domain/` bằng dòng re-export duy nhất
4. Chạy `pnpm run typecheck` — phải pass không lỗi (vì mọi import cũ vẫn resolve qua re-export)

## Success Criteria

- [ ] `src/types/cefr.ts` tồn tại với nội dung đúng
- [ ] `src/contracts/domain/cefr.ts` chỉ còn re-export
- [ ] `pnpm run typecheck` pass, không import nào vỡ

## Risk Assessment

Rủi ro thấp — chỉ tạo file mới + re-export, không xoá gì. Rollback: xoá `types/`, revert re-export.
