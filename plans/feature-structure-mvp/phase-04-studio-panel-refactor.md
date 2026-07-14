---
phase: 4
title: "Studio-Panel Refactor"
status: pending
priority: P3
effort: "2h"
dependencies: ["phase-01-analysis"]
---

# Phase 4: Studio-Panel Refactor

## Overview

Refactor studio-panel feature từ nested sang flat structure.

## Current Files (13 files)

```
src/features/studio-panel/
├── actions.ts
├── db/
│   ├── studio-artifact-questions.repository.ts
│   └── studio-artifacts.repository.ts
├── hooks/
│   └── use-study-artifacts.ts
├── lib/
│   └── studio-artifact-types.ts
├── schemas/
│   ├── chat.schema.ts
│   ├── question.schema.ts
│   └── studio-artifact.schema.ts
└── services/
    ├── passage-study.service.ts
    ├── question-generator.service.ts
    ├── studio-artifacts.service.ts
    └── studio-questions.service.ts
```

## Target Structure

```
src/features/studio-panel/
├── studio-panel.schema.ts        ← Merge schemas/
├── studio-panel.action.ts        ← Rename actions.ts
├── studio-panel.service.ts       ← Merge services/
├── studio-panel.repository.ts    ← Merge db/
├── studio-panel.types.ts        ← Merge lib/
├── hooks/                       ← Unchanged
├── lib/                         ← Unchanged
└── ui/                          ← Unchanged
```

## Implementation Steps

1. [ ] Merge schemas into `studio-panel.schema.ts`:
   - `chat.schema.ts`
   - `question.schema.ts`
   - `studio-artifact.schema.ts`
2. [ ] Rename `actions.ts` → `studio-panel.action.ts`
3. [ ] Create `studio-panel.repository.ts`:
   - Merge `db/studio-artifacts.repository.ts`
   - Merge `db/studio-artifact-questions.repository.ts`
4. [ ] Create `studio-panel.service.ts`:
   - Merge `services/studio-artifacts.service.ts`
   - Merge `services/studio-questions.service.ts`
   - Merge `services/passage-study.service.ts`
   - Merge `services/question-generator.service.ts`
5. [ ] Merge `lib/studio-artifact-types.ts` → `studio-panel.types.ts`
6. [ ] Update all imports
7. [ ] Delete old files
8. [ ] Verify typecheck

## Files to Delete After Migration

```
src/features/studio-panel/
├── actions.ts                           → merged
├── db/studio-artifact-questions.repository.ts → merged
├── db/studio-artifacts.repository.ts         → merged
├── lib/studio-artifact-types.ts              → merged
├── schemas/chat.schema.ts                  → merged
├── schemas/question.schema.ts              → merged
├── schemas/studio-artifact.schema.ts        → merged
└── services/*.service.ts                   → merged
```

## Success Criteria

- [ ] `studio-panel.schema.ts` exports all schemas and types
- [ ] `studio-panel.action.ts` contains all server actions
- [ ] `studio-panel.service.ts` contains all service functions
- [ ] `studio-panel.repository.ts` contains all repository functions
- [ ] `studio-panel.types.ts` contains shared types
- [ ] All imports updated
- [ ] TypeScript compiles without errors
