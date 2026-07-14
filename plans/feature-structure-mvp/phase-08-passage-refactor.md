---
phase: 8
title: "Passage Refactor"
status: pending
priority: P3
effort: "0.5h"
dependencies: ["phase-01-analysis"]
---

# Phase 8: Passage Refactor

## Overview

Refactor passage feature từ nested sang flat structure.

## Current Files (1 file)

```
src/features/passage/
└── db/
    └── passage.repository.ts
```

## Target Structure

```
src/features/passage/
├── passage.repository.ts  ← Move from db/ to root
├── hooks/               ← Unchanged
└── ui/                  ← Unchanged
```

## Note

passage feature ĐÃ GẦN FLAT - chỉ có 1 repository file trong db/. Move lên root là đủ.

## Implementation Steps

1. [ ] Move `db/passage.repository.ts` → `passage.repository.ts`
2. [ ] Delete empty `db/` directory
3. [ ] Update imports
4. [ ] Verify typecheck

## Files to Delete After Migration

```
src/features/passage/
└── db/passage.repository.ts  → moved to root
```

## Success Criteria

- [ ] `passage.repository.ts` at root level
- [ ] `db/` directory deleted
- [ ] All imports updated
- [ ] TypeScript compiles without errors
