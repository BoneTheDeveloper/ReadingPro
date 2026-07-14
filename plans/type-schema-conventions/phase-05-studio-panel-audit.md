---
phase: 5
title: "Studio-Panel Audit"
status: pending
priority: P3
effort: "0.5h"
dependencies: ["phase-01"]
---

# Phase 5: Studio-Panel Audit

## Overview

Audit và fix studio-panel feature theo convention.

## Files to Audit

```bash
src/features/studio-panel/
├── schemas/
│   ├── chat.schema.ts
│   ├── question.schema.ts
│   └── studio-artifact.schema.ts
├── actions.ts
├── hooks/use-study-artifacts.ts
└── ui/
```

## Checkpoints

- [ ] All schemas follow naming convention
- [ ] Client uses `import type` for DTOs

## Success Criteria

- [ ] All naming conventions followed
- [ ] TypeScript compiles without errors
