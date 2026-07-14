---
phase: 4
title: "Dictionary Audit"
status: pending
priority: P2
effort: "1h"
dependencies: ["phase-01"]
---

# Phase 4: Dictionary Audit

## Overview

Audit và fix dictionary feature theo convention.

## Files to Audit

```bash
src/features/dictionary/
├── schemas/dictionary.schema.ts
├── lib/dictionary-helpers.ts
├── services/
├── db/
├── hooks/
│   ├── use-dictionary-suggest.ts
│   ├── use-dictionary-entry-detail.ts
│   └── use-save-dictionary-vocabulary.ts
└── ui/
```

## Checkpoints

### Schema File

- [ ] Input schemas named `*InputSchema`
- [ ] DTOs named `*Dto`
- [ ] Check VALID_TRANSLATION_STATUSES

### Client Imports

- [ ] Hooks use `import type` cho DTOs

## Success Criteria

- [ ] All naming conventions followed
- [ ] Client uses `import type` for DTOs
- [ ] TypeScript compiles without errors
