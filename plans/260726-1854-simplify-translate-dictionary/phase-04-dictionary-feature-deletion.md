---
title: "Phase 4: Dictionary Feature Deletion"
status: pending
priority: P1
effort: 0h
dependencies: [phase-03-persistence-cleanup-and-toggle-save]
---

# Phase 4: Dictionary Feature Deletion

## Overview

Mostly already complete: the user has manually removed `src/features/dictionary/` and `src/app/(dashboard)/dictionary/`. This phase only sweeps dangling references in the navigation and any stale imports, then runs lint/knip.

## Current State

- Directory `src/features/dictionary/` is gone.
- Directory `src/app/(dashboard)/dictionary/` is gone.
- Prisma still references the seven dropped tables (deferred to Phase 3).

## Requirements

- Functional
  - Navigating to `/dictionary` returns 404.
  - The left navigation no longer links to "Từ điển".
- Non-functional
  - `pnpm knip` reports zero unused files or imports anywhere in the app.

## Related Code Files

- Modify: navigation/rail component that links to `/dictionary` — remove the entry and any unused icon import (search for `dictionary`, `Dictionary`, `Languages` icon import).
- Modify: any remaining placeholders/typos that still mention `/dictionary`.

## Implementation Steps

1. `pnpm knip`; for any reported unused file/import, remove the import or delete the file.
2. `pnpm typecheck && pnpm lint`.

## Success Criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm knip` all green.
- [ ] A grep for `/dictionary`, `from "@/features/dictionary"`, and `Dictionary` returns no matches outside `node_modules/`.

## Risk Assessment

- Small surface; primarily cosmetic. If a leftover `Language` icon import in the rail is unused, `knip` reports it.

## Security Considerations

- Pure deletion; no auth or data surface changes.