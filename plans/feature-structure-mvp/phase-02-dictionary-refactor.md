---
phase: 2
title: "Dictionary Refactor"
status: pending
priority: P2
effort: "2h"
dependencies: ["phase-01-analysis"]
---

# Phase 2: Dictionary Refactor

## Overview

Refactor dictionary feature từ nested sang flat structure.

## Current Files (16 files)

```
src/features/dictionary/
├── actions.ts
├── db/
│   ├── entry-detail.repository.ts
│   ├── lookup.repository.ts
│   └── suggest.repository.ts
├── hooks/
│   ├── use-dictionary-entry-detail.ts
│   ├── use-dictionary-suggest.ts
│   └── use-save-dictionary-vocabulary.ts
├── lib/
│   ├── dictionary-helpers.ts
│   └── normalize-dictionary-term.ts
├── schemas/
│   └── dictionary.schema.ts
└── services/
    ├── entry-detail.service.ts
    ├── lookup-quick.service.ts
    ├── lookup.service.ts
    └── suggest.service.ts
```

## Target Structure

```
src/features/dictionary/
├── dictionary.schema.ts       ← Copy from schemas/dictionary.schema.ts
├── dictionary.action.ts       ← Copy from actions.ts
├── dictionary.service.ts      ← Merge all services
├── dictionary.repository.ts   ← Merge all repos
├── dictionary.lib.ts          ← Copy from lib/ files
├── hooks/                    ← Unchanged
├── lib/                      ← Unchanged
└── ui/                       ← Unchanged
```

## Implementation Steps

1. [ ] Copy `schemas/dictionary.schema.ts` → `dictionary.schema.ts`
2. [ ] Rename `actions.ts` → `dictionary.action.ts`
3. [ ] Create `dictionary.repository.ts`:
   - Merge `db/entry-detail.repository.ts`
   - Merge `db/lookup.repository.ts`
   - Merge `db/suggest.repository.ts`
4. [ ] Create `dictionary.service.ts`:
   - Merge `services/entry-detail.service.ts`
   - Merge `services/lookup.service.ts`
   - Merge `services/lookup-quick.service.ts`
   - Merge `services/suggest.service.ts`
5. [ ] Update imports in all merged files
6. [ ] Add `import type` where client imports DTOs
7. [ ] Update exports in new files
8. [ ] Delete old files (after all features migrated)
9. [ ] Update imports in hooks and UI

## Files to Delete After Migration

```
src/features/dictionary/
├── actions.ts                    → merged into dictionary.action.ts
├── db/entry-detail.repository.ts → merged into dictionary.repository.ts
├── db/lookup.repository.ts       → merged into dictionary.repository.ts
├── db/suggest.repository.ts      → merged into dictionary.repository.ts
├── services/entry-detail.service.ts → merged into dictionary.service.ts
├── services/lookup-quick.service.ts  → merged into dictionary.service.ts
├── services/lookup.service.ts        → merged into dictionary.service.ts
└── services/suggest.service.ts       → merged into dictionary.service.ts
```

## Success Criteria

- [ ] `dictionary.schema.ts` exports all schemas and types
- [ ] `dictionary.action.ts` contains all server actions
- [ ] `dictionary.service.ts` contains all service functions
- [ ] `dictionary.repository.ts` contains all repository functions
- [ ] All hooks import from new file locations
- [ ] TypeScript compiles without errors
- [ ] Knip reports no new unused exports

## Type Import Updates

```typescript
// hooks/use-dictionary-suggest.ts - Client component
import type { DictionarySuggestItemDto } from "./dictionary.schema";
// ✅ import type required because file may contain Prisma later
```

## Risks

1. **Multiple functions with same name** → Prefix or namespace
2. **Circular dependencies** → Analyze before merge
3. **Test imports** → Update test files
