---
phase: 6
title: "Reading Audit"
status: pending
priority: P3
effort: "0.5h"
dependencies: ["phase-01"]
---

# Phase 6: Reading Audit

## Overview

Audit và fix reading feature theo convention.

## Files to Audit

```bash
src/features/reading/
├── schemas/translation.schema.ts
├── lib/translation-limits.ts  # Check MAX_* constants
└── ui/
```

## Checkpoints

- [ ] All schemas follow naming convention
- [ ] Constants named `MAX_*`
- [ ] Client uses `import type`

## Success Criteria

- [ ] All naming conventions followed
- [ ] TypeScript compiles without errors
