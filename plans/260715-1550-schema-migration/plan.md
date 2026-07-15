---
title: Migrate schema files to follow code-standards conventions
description: >-
  Migrate all feature schema files to use *InputSchema for input, interface *Dto
  for output, and remove response envelopes
status: completed
priority: P2
branch: preview
tags:
  - schema
  - migration
  - zod
  - dto
blockedBy: []
blocks: []
created: '2026-07-15T08:50:57.150Z'
createdBy: 'ck:plan'
source: skill
---

# Migrate schema files to follow code-standards conventions

## Overview

Migrate all feature schema files to follow `docs/code-standards.md` conventions:
- **Input**: `*InputSchema` (Zod, `.strict()`)
- **Output**: `interface *Dto` + `to*Dto()` mapper
- **Response envelope**: Only for third-party APIs, remove for internal

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [reading-schema](./phase-01-reading-schema.md) | Completed |
| 2 | [vocabulary-schema](./phase-02-vocabulary-schema.md) | Completed |
| 3 | [dictionary-schema](./phase-03-dictionary-schema.md) | Completed |
| 4 | [studio-panel-schema](./phase-04-studio-panel-schema.md) | Completed |
| 5 | [update-code-standards](./phase-05-update-code-standards.md) | Completed |

## Dependencies

None — phases can run in parallel.

## Scope

### In Scope
- Migrate schemas in `features/*/schemas/*.ts`
- Migrate schemas in `features/*/server/services/*.ts`
- Update all imports throughout the codebase
- Clean up response envelopes and `*DataSchema` patterns

### Out of Scope
- Upload schemas (already clean)
- `studio-artifact.ts` (already clean — `*InputSchema` only)
- `studyChatRequestSchema` (deliberately no `.strict()` for AI SDK compatibility)
- `questionGenerationDataSchema` (AI generation validation — legitimate use)
- Creating new features
- Database migrations

### Cleanup (Dead Code)
| File | Action |
|------|--------|
| `dictionary/schemas/dictionary.ts` | DELETE `dictionaryMissSchema` — dead code |
| `dictionary/schemas/dictionary.ts` | DELETE `dictionaryLookupDataSchema` — dead code |

### Special Cases
| Pattern | File | Action |
|---------|------|--------|
| `quickTranslationSchema` | lookup-quick.ts | Convert to `QuickTranslationDto` interface |
