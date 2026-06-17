---
phase: 1
title: "Docs SSOT Reorg"
status: pending
priority: P2
effort: "3h"
dependencies: []
---

# Phase 1: Docs SSOT Reorg

## Overview
Relocate requirements docs into a single `docs/Requirements/` home, dedupe the two
use-case docs into one, and tighten `docs/Database/` and `docs/Product/` to their true roles.

## Requirements
- Functional: requirements docs live in exactly one place; no duplicate use-cases; Database
  folder holds only DB docs; Product folder holds only scope/assumptions.
- Non-functional: no broken internal doc links introduced by the moves.

## Architecture
Target layout:
```
docs/Requirements/
  business-requirements.md   (move from docs/Database/brd.md)
  software-requirements.md   (move from docs/Database/srs.md)
  use-cases.md               (MERGE docs/Database/use-case.md + docs/Product/use-cases.md)
docs/Database/   -> data-dictionary, erd, migration-flow, neon-environment-contract only
docs/Product/    -> feature-scope.md (+ assumptions) only
```
Merge rule for use-cases: keep the richer `Database/use-case.md` structure (actor /
preconditions / steps) and fold in any unique UC ids from `Product/use-cases.md`; preserve
the `POST /api/...` route references.

## Related Code Files
- Create: `docs/Requirements/business-requirements.md`, `docs/Requirements/software-requirements.md`, `docs/Requirements/use-cases.md`
- Delete: `docs/Database/brd.md`, `docs/Database/srs.md`, `docs/Database/use-case.md`, `docs/Product/use-cases.md`
- Modify: `docs/README.md` (nav table + reading order), `docs/code-standards.md` (canonical-doc table if it points at moved files)

## Implementation Steps
1. `git mv docs/Database/brd.md docs/Requirements/business-requirements.md`.
2. `git mv docs/Database/srs.md docs/Requirements/software-requirements.md`.
3. Create `docs/Requirements/use-cases.md` by merging both use-case docs (Database structure + unique Product UCs); then delete both originals.
4. Update `docs/README.md` Main Sections table + reading order to add a `Requirements` row and re-point Product/Database descriptions to their narrowed roles.
5. Grep all docs for links to moved files and repair: `rg -n "brd\.md|srs\.md|Database/use-case|Product/use-cases" docs`.

## Success Criteria
- [ ] `docs/Requirements/` has business-requirements, software-requirements, use-cases
- [ ] No `use-case`/`use-cases` duplication anywhere under `docs/`
- [ ] `docs/Database/` contains only DB docs; `docs/Product/` only scope/assumptions
- [ ] `rg -n "Database/brd|Database/srs|Database/use-case|Product/use-cases" docs` returns nothing
- [ ] Markdown link check across `docs/` reports no new broken links

## Risk Assessment
Low. Risk = stale links after move. Mitigation: grep-based link sweep in step 5. No code
references requirement docs by filename (verified: `rg` over docs returned no matches).
