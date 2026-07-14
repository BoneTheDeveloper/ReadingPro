---
title: "Type/Schema Convention + Enum Migration"
description: "Document convention và migrate enums sang Prisma native"
status: pending
priority: P2
branch: "preview"
tags: ["convention", "documentation", "schema", "types", "enum"]
blockedBy: []
blocks: []
created: "2026-07-14T12:02:27.658Z"
createdBy: "ck:plan"
source: skill
---

# Type/Schema Convention + Enum Migration

## Overview

1. Document convention Type/Schema/Enum
2. Audit và fix code theo convention
3. Migrate hardcoded enums sang Prisma native enums

## Conventions

### Type/Schema

| Pattern | Naming | Syntax | Example |
|---------|--------|--------|---------|
| Input Schema | `*InputSchema` | `const` | `saveVocabularyInputSchema` |
| DTO | `*Dto` | `type` | `VocabularyItemDto` |
| Enum | Prisma native | `z.nativeEnum()` | `VocabularyStatus` |

### Enum: Single Source of Truth = Prisma Schema

```typescript
// 1. Define in Prisma
enum VocabularyStatus {
  NEW
  LEARNING
  MASTERED
}

// 2. Import type từ Prisma
import { VocabularyStatus } from "@/generated/prisma/client";

// 3. Zod validation
export const vocabularyStatusSchema = z.nativeEnum(VocabularyStatus);
```

### Import Rules

```typescript
// Client imports Prisma enum → import type
import type { VocabularyStatus } from "@/generated/prisma/client";

// Client imports DTO → import type
import type { VocabularyItemDto } from "@/features/vocabulary/schemas";

// Server-only → regular import
import { prisma } from "@/lib/prisma";
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Document](./phase-01-document.md) | Pending |
| 2 | [Audit/fix](./phase-02-audit-fix.md) | Pending |
| 3 | [Vocabulary Audit](./phase-03-vocabulary-audit.md) | Pending |
| 4 | [Dictionary Audit](./phase-04-dictionary-audit.md) | Pending |
| 5 | [Studio-Panel Audit](./phase-05-studio-panel-audit.md) | Pending |
| 6 | [Reading Audit](./phase-06-reading-audit.md) | Pending |
| 7 | [Upload Audit](./phase-07-upload-audit.md) | Pending |
| 8 | [Verify](./phase-08-verify.md) | Pending |
| 9 | [Enum Migration](./phase-09-enum-migration.md) | Pending |

## Dependencies

- Phase 8 blocked by phases 3-7
- Phase 9 blocked by phase 1

## Risks

1. **Enum migration** → Requires database migration
2. **Prisma generate** → Must run after schema change
3. **Existing data** → Values phải match enum definitions
