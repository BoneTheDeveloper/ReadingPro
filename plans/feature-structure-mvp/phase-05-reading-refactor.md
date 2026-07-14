---
phase: 5
title: "Reading Refactor"
status: pending
priority: P3
effort: "1.5h"
dependencies: ["phase-01-analysis"]
---

# Phase 5: Reading Refactor

## Overview

Refactor reading feature từ nested sang flat structure.

## Current Files (11 files)

```
src/features/reading/
├── db/
│   ├── inline-translate.repository.ts
│   └── translation.repository.ts
├── hooks/
│   └── use-scroll-progress.ts
├── lib/
│   ├── cefr-style.ts
│   ├── selection-utils.ts
│   ├── text-utils.ts
│   └── translation-limits.ts
├── schemas/
│   └── translation.schema.ts
└── services/
    ├── inline-translate.service.ts
    └── word-translate.service.ts
```

## Target Structure

```
src/features/reading/
├── reading.schema.ts        ← Copy from schemas/translation.schema.ts
├── reading.service.ts      ← Merge services/
├── reading.repository.ts   ← Merge db/
├── hooks/                 ← Unchanged
├── lib/                   ← Unchanged (small utilities)
└── ui/                    ← Unchanged
```

## Implementation Steps

1. [ ] Copy `schemas/translation.schema.ts` → `reading.schema.ts`
2. [ ] Create `reading.repository.ts`:
   - Merge `db/inline-translate.repository.ts`
   - Merge `db/translation.repository.ts`
3. [ ] Create `reading.service.ts`:
   - Merge `services/inline-translate.service.ts`
   - Merge `services/word-translate.service.ts`
4. [ ] Update all imports
5. [ ] Delete old files
6. [ ] Verify typecheck

## Files to Delete After Migration

```
src/features/reading/
├── db/inline-translate.repository.ts → merged
├── db/translation.repository.ts      → merged
├── schemas/translation.schema.ts    → merged
└── services/inline-translate.service.ts → merged
└── services/word-translate.service.ts   → merged
```

## Success Criteria

- [ ] `reading.schema.ts` exports all schemas and types
- [ ] `reading.service.ts` contains all service functions
- [ ] `reading.repository.ts` contains all repository functions
- [ ] All imports updated
- [ ] TypeScript compiles without errors
