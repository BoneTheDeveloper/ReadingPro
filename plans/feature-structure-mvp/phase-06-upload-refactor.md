---
phase: 6
title: "Upload Refactor"
status: pending
priority: P3
effort: "1h"
dependencies: ["phase-01-analysis"]
---

# Phase 6: Upload Refactor

## Overview

Refactor upload feature từ nested sang flat structure.

## Current Files (6 files)

```
src/features/upload/
├── actions.ts
├── hooks/
│   └── use-upload-submit.ts
├── lib/
│   ├── pdf-parsers.ts
│   └── upload-validation.ts
└── schemas/
    └── upload.schema.ts
```

## Target Structure

```
src/features/upload/
├── upload.schema.ts        ← Copy from schemas/upload.schema.ts
├── upload.action.ts        ← Rename actions.ts
├── upload.lib.ts          ← Merge lib/ files
├── hooks/                 ← Unchanged
└── ui/                   ← Unchanged
```

## Note

Upload feature NHỎ - không có services hoặc db files riêng. Chỉ cần flatten schemas và actions.

## Implementation Steps

1. [ ] Copy `schemas/upload.schema.ts` → `upload.schema.ts`
2. [ ] Rename `actions.ts` → `upload.action.ts`
3. [ ] Merge `lib/` files → `upload.lib.ts`
4. [ ] Update imports
5. [ ] Delete old files
6. [ ] Verify typecheck

## Files to Delete After Migration

```
src/features/upload/
├── actions.ts                    → merged
├── lib/pdf-parsers.ts           → merged into upload.lib.ts
├── lib/upload-validation.ts     → merged into upload.lib.ts
└── schemas/upload.schema.ts      → merged
```

## Success Criteria

- [ ] `upload.schema.ts` exports all schemas and types
- [ ] `upload.action.ts` contains all server actions
- [ ] `upload.lib.ts` contains utility functions
- [ ] All imports updated
- [ ] TypeScript compiles without errors
