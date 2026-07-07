---
phase: 1
title: "Schema files into schemas folder"
status: completed
priority: P2
effort: "1h"
dependencies: [0]
---

# Phase 1: Schema files into schemas folder

## Overview

Strict rule: every feature with ≥1 schema file must keep it under `schemas/`, never flat at
feature root. 5 features currently violate this. Pure file move + import path update, no
content/logic changes.

## Requirements

- Functional: app behavior unchanged.
- Non-functional: `schemas/*.schema.ts` exists for all 5 features below; no file left at feature root.

## Related Code Files

| Move | To |
|---|---|
| `src/features/dictionary/dictionary.schema.ts` | `src/features/dictionary/schemas/dictionary.schema.ts` |
| `src/features/vocabulary/vocabulary.schema.ts` | `src/features/vocabulary/schemas/vocabulary.schema.ts` |
| `src/features/reading/translation.schema.ts` | `src/features/reading/schemas/translation.schema.ts` |
| `src/features/learning-session/learning-session.schema.ts` | `src/features/learning-session/schemas/learning-session.schema.ts` |
| `src/features/upload/upload.schema.ts` | `src/features/upload/schemas/upload.schema.ts` |

Known importers to update (grep-verified 2026-07-07; re-grep before editing in case new
importers appeared since):

- **dictionary.schema**: `services/lookup-service.ts`, `dictionary-client.ts`, `services/search-service.ts`, `ui/dictionary-suggest-dropdown.tsx`, `hooks/use-dictionary-suggest.ts`, `hooks/use-save-dictionary-vocabulary.ts`, `services/suggest-service.ts`, `ui/dictionary-entry-card.tsx`, `hooks/use-dictionary-entry-detail.ts`, `src/app/api/dictionary/lookup/route.ts`, `src/app/api/dictionary/search/route.ts`
- **vocabulary.schema**: `vocabulary-client.ts`, `db/shared/vocabulary-dto-builders.ts`, `db/vocabulary-items.service.ts`, `db/sets/vocabulary-sets.service.ts`, `hooks/use-vocabulary-stats.ts`, `src/features/dictionary/dictionary-client.ts` (cross-feature import)
- **translation.schema** (reading): after Phase 0 fix, importers are `study-workspace-client.tsx` and `study/shared/types.ts` — re-grep for `features/reading/translation.schema` after Phase 0 lands
- **learning-session.schema**: `src/app/api/learning-session/route.ts`
- **upload.schema**: `src/features/source-panel/upload-client.ts`

## Implementation Steps

1. `git mv` each file per the table above (creates `schemas/` dir automatically).
2. For each moved file, grep its old import path across `src/` and `app/` and update every hit to the new `schemas/` path.
3. Re-run `pnpm run typecheck` after each feature's move (5 checkpoints) — fix immediately if a hit was missed.
4. `pnpm run lint`.

## Success Criteria

- [x] 5 files moved to `schemas/<feature>.schema.ts`
- [x] Zero remaining imports of the old root-level paths (grep confirms 0 hits per file)
- [x] `pnpm run typecheck && pnpm run lint` pass

## Risk Assessment

Low — pure move + path rewrite, TypeScript compiler will surface any missed import immediately.
Cross-feature import in `dictionary-client.ts` → `vocabulary.schema` is the only inter-feature
dependency; verify it specifically after the vocabulary move.
