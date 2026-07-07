---
phase: 2
title: "Service files split from db"
status: completed
priority: P2
effort: "1h"
dependencies: [0]
---

# Phase 2: Service files split from db

## Overview

Per `docs/code-standards.md`: `db/` is repository-only (Prisma/SQL access), `services/` owns
business logic + DTO building. 4 features currently have `*-service.ts` files sitting inside
`db/`, blurring that boundary. Pure move + import path update, no logic changes.

## Requirements

- Functional: app behavior unchanged.
- Non-functional: no `*-service.ts` or `*-service` file remains under any `db/` directory.

## Related Code Files

| Move | To |
|---|---|
| `src/features/vocabulary/db/vocabulary-items.service.ts` | `src/features/vocabulary/services/vocabulary-items.service.ts` |
| `src/features/vocabulary/db/sets/vocabulary-sets.service.ts` | `src/features/vocabulary/services/sets/vocabulary-sets.service.ts` |
| `src/features/reading/db/inline-translate.service.ts` | `src/features/reading/services/inline-translate.service.ts` |
| `src/features/upload/db/content-analysis/content-analysis.service.ts` | `src/features/upload/services/content-analysis.service.ts` |
| `src/features/passage/db/passage-study.service.ts` | `src/features/passage/services/passage-study.service.ts` |
| `src/features/passage/db/studio-artifacts-service.ts` | `src/features/passage/services/studio-artifacts.service.ts` |

Known importers to update (grep-verified 2026-07-07):

- **vocabulary-items.service**: `src/app/api/vocabulary/[id]/route.ts`, `src/app/api/vocabulary/route.ts`, `src/app/api/vocabulary/stats/route.ts`, `src/app/[locale]/(dashboard)/study/_components/actions.ts`, `src/app/api/vocabulary/[id]/status/route.ts`, `src/app/api/vocabulary/[id]/review/route.ts`, `src/app/api/vocabulary/list/route.ts`
- **vocabulary-sets.service**: `src/app/api/vocabulary/sets/route.ts`, `src/app/api/vocabulary/sets/[id]/items/[itemId]/route.ts`, `src/app/api/vocabulary/sets/[id]/route.ts`, `src/app/api/vocabulary/sets/[id]/items/route.ts`
- **inline-translate.service**: `src/app/api/translate/route.ts` (path already normalized by Phase 0)
- **content-analysis.service**: `src/features/upload/db/upload-workflow.ts`, `src/app/api/upload/text/route.ts`
- **passage-study.service**: `src/app/api/studio/questions/route.ts`
- **studio-artifacts-service** (note: renamed to `studio-artifacts.service.ts` here — filename gains the `.service` suffix for consistency): `src/features/studio-panel/actions.ts`

## Implementation Steps

1. `git mv` each file per the table (creates `services/` dirs as needed, including nested `services/sets/`).
2. Note the one filename normalization: `studio-artifacts-service.ts` → `studio-artifacts.service.ts` (adds the missing `.service` suffix to match convention) — update its import specifier accordingly, not just the directory.
3. For each moved file, grep old import path and update every hit.
4. Re-run `pnpm run typecheck` after each feature's move (4 checkpoints).
5. `pnpm run lint`.

## Success Criteria

- [x] 6 files moved out of `db/` into `services/` (mirroring nesting where it existed, e.g. `sets/`)
- [x] `studio-artifacts-service.ts` renamed to `studio-artifacts.service.ts`
- [x] Zero remaining imports of old `db/*-service*` paths
- [x] `pnpm run typecheck && pnpm run lint` pass

## Risk Assessment

Low-medium — more importers than Phase 1 (mostly `app/api/**/route.ts` files), but each is a
single straightforward import-path swap. `upload/db/upload-workflow.ts` importing
`content-analysis.service` is an intra-feature db→service reference; confirm it still doesn't
reach back to import anything from `services/` that would create a circular concern (service
must not import repository-adjacent orchestration in reverse — verify `upload-workflow.ts`'s own
layer classification is out of scope for this phase, no change to its own location).
