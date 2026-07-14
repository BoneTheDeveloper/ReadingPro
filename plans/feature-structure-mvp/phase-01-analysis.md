---
phase: 1
title: "Analysis"
status: pending
priority: P1
effort: "1h"
dependencies: []
---

# Phase 1: Analysis

## Overview

Phân tích codebase để hiểu:
1. Các file cần merge trong mỗi feature
2. Dependencies giữa files
3. Import/export patterns hiện tại
4. Backward compatibility requirements

## Requirements

- Functional: Map all current files to target structure
- Non-functional: Không break existing functionality

## Current Structure Analysis

### Dictionary (16 files)
```
Current:
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

Target:
├── dictionary.schema.ts      ← merge schemas/
├── dictionary.action.ts      ← rename actions.ts
├── dictionary.service.ts     ← merge services/
├── dictionary.repository.ts  ← merge db/
└── (hooks/, lib/, ui/)     ← unchanged
```

### Vocabulary (8 files)
```
Current:
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

Target:
├── vocabulary.schema.ts      ← vocabulary.schema.ts
├── vocabulary.action.ts     ← rename actions.ts
├── vocabulary.service.ts    ← merge 3 services
└── vocabulary.repository.ts ← merge 3 repos
```

## Implementation Steps

1. [ ] Analyze dictionary feature: list all exports, imports, dependencies
2. [ ] Analyze vocabulary feature: list all exports, imports, dependencies
3. [ ] Analyze studio-panel feature
4. [ ] Analyze reading feature
5. [ ] Analyze upload feature
6. [ ] Analyze ai-chat feature
7. [ ] Analyze passage feature
8. [ ] Create merge plan for each feature
9. [ ] Verify no circular dependencies

## Success Criteria

- [ ] All 7 features analyzed
- [ ] Merge plan documented per feature
- [ ] No circular dependencies detected
- [ ] Backward compatibility requirements identified

## Output

Document per feature:
- Files to merge
- Order of merge (dependencies)
- Breaking changes (if any)
- Backward-compatible exports needed
