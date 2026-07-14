---
phase: 1
title: "Document Conventions"
status: pending
priority: P1
effort: "0.5h"
dependencies: []
---

# Phase 1: Document Conventions

## Overview

Cập nhật `docs/code-standards.md` với convention Type/Schema/Enum mới.

## Requirements

- Add Type/Schema convention section
- Add Enum convention (Prisma native enum + z.nativeEnum)
- Add file naming rules
- Add import rules
- Add examples

## Convention: Enum

### Single Source of Truth = Prisma Schema

```typescript
// ✅ 1. Define enum in Prisma
enum VocabularyStatus {
  NEW
  LEARNING
  MASTERED
}

// ✅ 2. Import type from Prisma generated
import { VocabularyStatus } from "@/generated/prisma/client";

// ✅ 3. Create Zod schema from Prisma enum
export const vocabularyStatusSchema = z.nativeEnum(VocabularyStatus);
```

## Implementation Steps

1. [ ] Read current `docs/code-standards.md`
2. [ ] Add Type/Schema convention section
3. [ ] Add Enum convention (Prisma native enum)
4. [ ] Add file naming rules
5. [ ] Add import rules
6. [ ] Review với user

## Success Criteria

- [ ] Convention documented in code-standards.md
- [ ] Enum convention: Prisma schema → single source
- [ ] Clear examples for each pattern
- [ ] User approves documentation
