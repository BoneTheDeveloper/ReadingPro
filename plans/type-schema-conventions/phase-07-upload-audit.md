---
phase: 7
title: "Upload Audit"
status: pending
priority: P3
effort: "0.5h"
dependencies: ["phase-01"]
---

# Phase 7: Upload Audit

## Overview

Audit và fix upload feature theo convention.

## Files to Audit

```bash
src/features/upload/
├── schemas/upload.schema.ts
├── lib/upload-validation.ts    # Check MAX_*, ALLOWED_* constants
├── actions.ts
└── hooks/use-upload-submit.ts
```

## Checkpoints

- [ ] All schemas follow naming convention
- [ ] Constants named `MAX_*` or `ALLOWED_*`
- [ ] Client uses `import type`

## Success Criteria

- [ ] All naming conventions followed
- [ ] TypeScript compiles without errors
