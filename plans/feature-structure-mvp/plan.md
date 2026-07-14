---
title: "Feature Structure Flat MVP Convention"
description: "Restructure all 7 features to follow flat convention: *.schema.ts, *.action.ts, *.service.ts, *.repository.ts"
status: pending
priority: P2
branch: "preview"
tags: ["refactor", "convention", "architecture"]
blockedBy: []
blocks: []
created: "2026-07-14T11:40:21.465Z"
createdBy: "ck:plan"
source: skill
---

# Feature Structure Flat MVP Convention

## Overview

Refactor tất cả features từ nested structure sang flat structure theo convention MVP:

```
features/<feature>/
├── <feature>.schema.ts     ← Zod schemas + inferred types (NOT server-only)
├── <feature>.action.ts     ← "use server"
├── <feature>.service.ts    ← server-only, merged services
├── <feature>.repository.ts ← server-only, merged repos
└── ui/                    ← components (unchanged)
├── hooks/                 ← hooks (unchanged)
└── lib/                   ← lib utilities (unchanged)
```

## Convention Rules

| Pattern | Schema? | Client Export? | File |
|---------|---------|----------------|------|
| Action Input | ✅ Zod | ❌ Server-only | *.schema.ts |
| Action Output | ❌ | ✅ Type only | *.action.ts |
| DTO | ❌ | ✅ Type only | *.schema.ts |
| Service Params | ❌ | ❌ Server-only | *.service.ts |
| Repository Row | ❌ | ❌ Server-only | *.repository.ts |
| Component Props | ❌ | N/A | ui/*.tsx |
| UI State | ❌ | N/A | ui/*.tsx |
| Feature Enum | ✅ Optional | ✅ Type + Value | *.schema.ts |
| Prisma Enum | ❌ derive | ✅ import type | re-export |
| API Envelope | ✅ | ✅ Type | lib/http/api-envelope-schema.ts |

## Type Import Rule

```typescript
// ✅ Client imports type from file with Prisma → MUST use import type
import type { VocabularyItemDto } from "@/features/vocabulary/schema";

// ✅ Server-only files → use regular import
import { prisma } from "@/lib/prisma";
```

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Analysis](./phase-01-analysis.md) | Pending |
| 2 | [Dictionary Refactor](./phase-02-dictionary-refactor.md) | Pending |
| 3 | [Vocabulary Refactor](./phase-03-vocabulary-refactor.md) | Pending |
| 4 | [Studio-Panel Refactor](./phase-04-studio-panel-refactor.md) | Pending |
| 5 | [Reading Refactor](./phase-05-reading-refactor.md) | Pending |
| 6 | [Upload Refactor](./phase-06-upload-refactor.md) | Pending |
| 7 | [Ai-Chat Refactor](./phase-07-ai-chat-refactor.md) | Pending |
| 8 | [Passage Refactor](./phase-08-passage-refactor.md) | Pending |
| 9 | [Verify](./phase-09-verify.md) | Pending |

## Dependencies

- Phase 9 (Verify) blocked by all previous phases

## Risks

1. **Breaking changes** → Maintain backward-compatible exports during migration
2. **Import paths** → Update all imports across codebase
3. **Knip false positives** → May need knip config update after refactor
