---
phase: 9
title: "Enum Migration"
status: pending
priority: P2
effort: "2h"
dependencies: ["phase-01"]
---

# Phase 9: Enum Migration

## Overview

Migrate hardcoded enums sang Prisma native enums.

## Current Problems

```typescript
// ❌ HARDCODED - drift risk
export const vocabularyStatusSchema = z.enum(["NEW", "LEARNING", "MASTERED"]);
export const vocabularySourceSchema = z.enum(["TRANSLATE", "DICTIONARY"]);

// Database là String, không phải enum
model VocabularyItem {
  status String @default("NEW")
  source String @default("TRANSLATE")
}
```

## Target: Prisma Native Enum

```prisma
// prisma/schema.prisma
enum VocabularyStatus {
  NEW
  LEARNING
  MASTERED
}

enum VocabularySourceType {
  TRANSLATE
  DICTIONARY
}

model VocabularyItem {
  status VocabularyStatus @default(NEW)
  source VocabularySourceType @default(TRANSLATE)
}
```

```typescript
// ✅ Type từ Prisma generated
import { VocabularyStatus } from "@/generated/prisma/client";

// ✅ Zod từ Prisma enum
export const vocabularyStatusSchema = z.nativeEnum(VocabularyStatus);
```

## Enums to Migrate

### Vocabulary (Prisma)

| Field | Current Type | Target Enum |
|-------|-------------|------------|
| status | String | VocabularyStatus |
| source | String | VocabularySourceType |

### Existing Prisma Enums (already good)

- CEFRLevel ✅
- SourceType (upload) ✅
- QuestionType ✅
- VocabularySetType ✅
- UploadStatus ✅

## Implementation Steps

1. [ ] Add VocabularyStatus enum to Prisma
2. [ ] Add VocabularySourceType enum to Prisma
3. [ ] Update VocabularyItem model
4. [ ] Run `prisma migrate dev --name add_vocabulary_enums`
5. [ ] Update vocabulary.schema.ts
6. [ ] Run typecheck
7. [ ] Test vocabulary CRUD

## Success Criteria

- [ ] Prisma enums created
- [ ] Migration runs successfully
- [ ] All enums use z.nativeEnum()
- [ ] TypeScript compiles without errors
- [ ] Vocabulary CRUD works

## Risks

1. **Database migration** → Backup data trước
2. **Existing data** → Values phải match enum values
3. **Prisma generate** → Must run after schema change
