---
phase: 3
title: "Convention Hub + Import Rule"
status: completed
priority: P1
effort: "2h"
dependencies: [1]
---

# Phase 3: Convention Hub + Import Rule

## Overview
Make `docs/code-standards.md` the single lean convention doc agents read first: trim
codebase minutiae, fix dead links, and add the import-path convention. Repair broken nav in
`docs/README.md` and `tests/README.md`.

## Requirements
- Functional: code-standards.md is the one general hub; all its links resolve; it states the
  import-path rule; CLAUDE.md continues pointing here first (already does).
- Non-functional: clear and navigable (tables + links), not exhaustive — detailed rules stay
  in owning folders.

## Architecture
Import-path convention to document (matches de-facto code: 395 alias vs 115 relative):
> Use the `@/` alias when an import crosses a module/feature/layer boundary.
> Use a relative path (`./`, `../`) only within the same module/feature folder.

Known dead links to fix or remove (verified missing):
`Operations/root-configuration.md`, `Operations/local-development.md`,
`prisma/migrations-guide.md`, `prisma/SECURITY.md`, `playwright/README.md`,
`tests/performance/query-budget-benchmarks.md`, and `docs/quality-assurance/`
(referenced by `tests/README.md`). Policy (validated): **remove every dead link; create no
stubs.** Strip the broken link/table-row; leave surrounding prose intact.

## Related Code Files
- Modify: `docs/code-standards.md` (trim + add import rule + fix canonical-doc table links)
- Modify: `docs/README.md` (fix reading-order + Source-Of-Truth-Rules dead links)
- Modify: `tests/README.md` (fix `docs/quality-assurance/` reference)

## Implementation Steps
1. Audit every link in `code-standards.md` and `docs/README.md`: `rg -o "\]\(([^)]+)\)" docs/code-standards.md docs/README.md` then test each path exists.
2. For each dead link: remove the link/row (no stubs).
3. Add an "Import Paths" subsection to `code-standards.md` Naming/Boundary area with the alias-vs-relative rule and a one-line rationale (safe renames + clear boundaries).
4. Trim any over-detailed codebase specifics in code-standards.md that duplicate folder-local docs (keep broad concept + link).
5. Fix `tests/README.md` `docs/quality-assurance/` reference (drop the line; no stub).

## Success Criteria
- [ ] Import-path rule present in `code-standards.md`
- [ ] All links in `code-standards.md`, `docs/README.md`, `tests/README.md` resolve
- [ ] code-standards.md stays broad (no duplicated detailed rules) and reads as the single hub
- [ ] `rg -o "\]\(([^)]+\.md)\)" docs/code-standards.md docs/README.md` paths all exist

## Risk Assessment
Low. Policy is remove-only (no stubs), so the only risk is losing the intent signal of a
referenced-but-missing doc. Accepted: such intent belongs in plans/issues, not dead doc links.
