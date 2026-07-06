---
title: Schema File Naming (.schema.ts) + DTO Utility Cleanup
description: ''
status: completed
priority: P2
branch: preview
tags: []
blockedBy: []
blocks: []
created: '2026-07-06T19:12:21.927Z'
createdBy: 'ck:plan'
source: skill
---

# Schema File Naming (.schema.ts) + DTO Utility Cleanup

## Overview

Adopt the `*.schema.ts` file-naming convention across the app and remove the last redundant DTO
utility barrel. **No type renames, no logic changes.** All wire types are already `z.infer` from
zod schemas (verified: 18 `z.infer` type defs, 0 hand-written `Dto` types), so this is purely a
file-rename + dead-utility cleanup.

**In scope**
- Rename 9 schema files `*-schema.ts` → `*.schema.ts` and update every import path.
- Delete `src/features/vocabulary/model/vocabulary-types.ts` (a barrel whose only job is aliasing
  `VocabularyItemDto` → `VocabularyItem`; pointless once `Dto` naming is the convention) and repoint
  its 8 importers to the `*Dto` names directly.

**Explicitly NOT in scope** (per user decisions)
- Keep all `XxxDto` type names.
- Keep all mapper function names (`buildEntryDto`, `toTranslationDto`, …) and the two
  `*-dto-builders.ts` files.
- Keep real-logic files that happen to sit in `schemas/`: `studio-artifact-types.ts`,
  `dictionary-helpers.ts`, `normalize-dictionary-term.ts`, `text-utils.ts`, etc.

**Naming rule:** convert the trailing `-schema` segment to `.schema`, preserving the descriptor —
`dictionary-response-schema.ts` → `dictionary-response.schema.ts`, `chat-schema.ts` → `chat.schema.ts`.
(Alternative considered: drop the redundant `-response` to get `dictionary.schema.ts`. Rejected as
default to keep the rename mechanical/low-risk; flag if you prefer it.)

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Rename schema files to .schema.ts](./phase-01-rename-schema-files-to-schema-ts.md) | Completed |
| 2 | [Remove redundant DTO utility barrel](./phase-02-remove-redundant-dto-utility-barrel.md) | Completed |
| 3 | [Verify build and update docs](./phase-03-verify-build-and-update-docs.md) | Completed |

## Dependencies

Soft relation (not a hard block): `plans/20260706-1751-src-feature-colocation-restructure` (status:
pending) also touches feature file layout. If that restructure runs first and moves schema files,
re-derive the file list here before executing. Recommend running this small rename **after** the
colocation restructure, or confirming the two don't move the same files. No frontmatter block added
until the relationship is confirmed.

## Verification (all phases)

```bash
pnpm run typecheck   # tsc --noEmit — catches every broken import path / identifier
pnpm run lint        # eslint
pnpm run test        # vitest
```
Typecheck is the real safety net: a missed import path or a leftover `VocabularyItem` alias fails to compile.
