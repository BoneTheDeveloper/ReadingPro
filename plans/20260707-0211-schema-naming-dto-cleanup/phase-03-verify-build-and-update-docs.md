---
phase: 3
title: Verify build and update docs
status: completed
effort: ''
---

# Phase 3: Verify build and update docs

## Overview

Full build verification, then update the two docs that describe schema-file locations so they use
the `.schema.ts` convention and stop referencing the deleted barrel.

## Implementation Steps

1. Run the full gate:
   ```bash
   pnpm run typecheck && pnpm run lint && pnpm run test
   ```
   All must pass. Do not mark done on any failure.
2. Update `docs/code-standards.md`:
   - **Schemas** layer row: path `features/<f>/schemas/*-response-schema.ts` →
     `features/<f>/schemas/*.schema.ts`.
   - Note the convention explicitly: "zod schema files use the `*.schema.ts` suffix."
3. Update `docs/codebase-summary.md`:
   - Feature-slice pattern block: `schemas/` example filenames → `*.schema.ts`.
   - "Frontend Validation" note: `*-response-schema.ts` → `*.schema.ts`.
   - If it enumerates `vocabulary/model/`, drop `vocabulary-types.ts`.
4. Grep the docs for stale references: `grep -rn 'response-schema\|vocabulary-types' docs/` → only
   intentional prose should remain.

## Related Code Files

- Modify: `docs/code-standards.md`, `docs/codebase-summary.md`

## Success Criteria

- [ ] `pnpm run typecheck && pnpm run lint && pnpm run test` all green.
- [ ] Docs reference `*.schema.ts`; no stale `*-response-schema` paths or `vocabulary-types` mentions.
- [ ] `git status` shows only renames (R) + the two deletions + doc edits — no stray content diffs in renamed schema files.
