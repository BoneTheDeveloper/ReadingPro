---
phase: 2
title: "Audit/fix"
status: pending
priority: P2
effort: "1h"
dependencies: ["phase-01"]
---

# Phase 2: Audit/fix

## Overview

Fix `import type` usage trong codebase - Client imports phải dùng `import type` khi import từ file có Prisma.

## Problem

```typescript
// ❌ Client component - thiếu import type
import { VocabularyItemDto } from "@/features/vocabulary/schemas";
// Nếu schema file có Prisma imports → runtime sẽ kéo Prisma vào client
```

## Solution

```typescript
// ✅ Client component - dùng import type
import type { VocabularyItemDto } from "@/features/vocabulary/schemas";
// Type được xóa lúc compile, Prisma không vào client
```

## Files to Audit

```bash
# Tìm tất cả client files (components, hooks)
src/**/*.tsx
src/**/hooks/*.ts
src/**/ui/*.tsx
```

## Implementation Steps

1. [ ] Scan codebase cho non-type imports từ schema files
2. [ ] Update imports trong hooks
3. [ ] Update imports trong UI components
4. [ ] Verify không có Prisma leak vào client

## Success Criteria

- [ ] All client imports from schema files use `import type`
- [ ] No Prisma imports in client bundles
- [ ] TypeScript compiles without errors
