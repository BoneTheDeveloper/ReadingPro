---
phase: 3
title: "Vocabulary Audit"
status: pending
priority: P2
effort: "1h"
dependencies: ["phase-01"]
---

# Phase 3: Vocabulary Audit

## Overview

Audit và fix vocabulary feature theo convention.

## Files to Audit

```bash
src/features/vocabulary/
├── schemas/vocabulary.schema.ts  # Main schema file
├── actions.ts                   # Check imports
├── services/vocabulary-items.service.ts
├── db/vocabulary-items.repository.ts
└── ui/
    ├── vocabulary-page.tsx
    ├── vocabulary-list.tsx
    └── vocabulary-set-list.tsx
```

## Checkpoints

### Schema File

- [ ] Input schemas named `*InputSchema` with `const`
- [ ] DTOs named `*Dto` with `type`
- [ ] Enums use Prisma native (phase 9)

### Service/Repository

- [ ] Service params là interface
- [ ] Repository row là internal type

### Client Imports

- [ ] UI components use `import type` cho DTOs

## Success Criteria

- [ ] All naming conventions followed
- [ ] Client uses `import type` for DTOs
- [ ] TypeScript compiles without errors
