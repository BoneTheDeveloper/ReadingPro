---
phase: 3
title: "Learning-session queries into db folder"
status: completed
priority: P3
effort: "20m"
dependencies: [0]
---

# Phase 3: Learning-session queries into db folder

## Overview

`learning-session-queries.ts` sits at feature root instead of `db/`. Single-file move + import
update, no logic changes.

## Requirements

- Functional: app behavior unchanged.
- Non-functional: `src/features/learning-session/db/learning-session-queries.ts` exists; nothing DB-related left at feature root.

## Related Code Files

- Move: `src/features/learning-session/learning-session-queries.ts` → `src/features/learning-session/db/learning-session-queries.ts`
- Modify (known importer, grep-verified 2026-07-07): `src/app/api/learning-session/route.ts`

## Implementation Steps

1. `git mv src/features/learning-session/learning-session-queries.ts src/features/learning-session/db/learning-session-queries.ts`
2. Update the import in `src/app/api/learning-session/route.ts`.
3. Re-grep `features/learning-session/learning-session-queries` across `src/` and `app/` to confirm zero remaining hits at the old path.
4. `pnpm run typecheck && pnpm run lint`.

## Success Criteria

- [x] File lives at `db/learning-session-queries.ts`
- [x] Zero remaining imports of the old root-level path
- [x] `pnpm run typecheck && pnpm run lint` pass

## Risk Assessment

Very low — single file, single known importer.
