---
phase: 3
title: "Vocabulary Refactor"
status: pending
priority: P2
effort: "1.5h"
dependencies: ["phase-01-analysis"]
---

# Phase 3: Vocabulary Refactor

## Overview

Refactor vocabulary feature từ nested sang flat structure.

## Current Files (8 files)

```
src/features/vocabulary/
├── actions.ts
├── db/
│   ├── vocabulary-item-progress.repository.ts
│   ├── vocabulary-items.repository.ts
│   └── vocabulary-sets.repository.ts
├── schemas/
│   └── vocabulary.schema.ts
├── services/
│   ├── vocabulary-items.service.ts
│   ├── vocabulary-scheduler.service.ts
│   └── vocabulary-sets.service.ts
└── ui/
```

## Target Structure

```
src/features/vocabulary/
├── vocabulary.schema.ts       ← Copy from schemas/vocabulary.schema.ts
├── vocabulary.action.ts       ← Copy from actions.ts
├── vocabulary.service.ts      ← Merge all services
├── vocabulary.repository.ts   ← Merge all repos
├── hooks/                    ← Unchanged (use-vocabulary-mutations.ts deleted)
├── ui/                       ← Unchanged
└── services/                 ← TO BE DELETED (merged into vocabulary.service.ts)
```

## Implementation Steps

1. [ ] Copy `schemas/vocabulary.schema.ts` → `vocabulary.schema.ts`
2. [ ] Rename `actions.ts` → `vocabulary.action.ts`
3. [ ] Create `vocabulary.repository.ts`:
   - Merge `db/vocabulary-items.repository.ts`
   - Merge `db/vocabulary-item-progress.repository.ts`
   - Merge `db/vocabulary-sets.repository.ts`
4. [ ] Create `vocabulary.service.ts`:
   - Merge `services/vocabulary-items.service.ts`
   - Merge `services/vocabulary-sets.service.ts`
   - Skip `services/vocabulary-scheduler.service.ts` (keep separate - timing logic)
5. [ ] Update imports in merged files
6. [ ] Add `import type` where client imports DTOs
7. [ ] Delete old files after migration
8. [ ] Update imports in UI components

## Files to Delete After Migration

```
src/features/vocabulary/
├── actions.ts                         → merged
├── db/vocabulary-items.repository.ts  → merged
├── db/vocabulary-item-progress.repository.ts → merged
├── db/vocabulary-sets.repository.ts   → merged
├── schemas/vocabulary.schema.ts       → merged
├── services/vocabulary-items.service.ts   → merged
├── services/vocabulary-sets.service.ts    → merged
└── services/vocabulary-scheduler.service.ts → SKIP, keep separate
```

## Note

`vocabulary-scheduler.service.ts` giữ riêng vì chứa timing/scheduling logic không liên quan đến CRUD operations.

## Success Criteria

- [ ] `vocabulary.schema.ts` exports all schemas and types
- [ ] `vocabulary.action.ts` contains all server actions
- [ ] `vocabulary.service.ts` contains CRUD service functions
- [ ] `vocabulary.repository.ts` contains all repository functions
- [ ] `vocabulary-scheduler.service.ts` remains separate
- [ ] All UI imports updated
- [ ] TypeScript compiles without errors
