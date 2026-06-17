---
phase: 2
title: "New Requirement Docs"
status: pending
priority: P2
effort: "4h"
dependencies: [1]
---

# Phase 2: New Requirement Docs

## Overview
Author the three missing industry-standard requirement docs under `docs/Requirements/`:
user stories, test scenarios, and a traceability matrix.

## Requirements
- Functional: each doc is grounded in existing use-cases (UC-01..UC-N) and real API routes
  from `docs/API/api-index.md`; no invented features.
- Non-functional: traceable IDs so coverage gaps are visible.

## Architecture
- `user-stories.md`: `US-xx` rows, As-a / I-want / so-that, each linked to a `UC-xx`.
- `test-scenarios.md`: scenario catalog (Given/When/Then table) keyed `TS-xx`, mapped to
  `US-xx` + `UC-xx`; reference real suites in `tests/` where they already exist.
- `traceability-matrix.md`: single table `US-xx -> UC-xx -> API route -> TS-xx -> test file`.

Source material: `docs/Requirements/use-cases.md` (Phase 1), `docs/Product/feature-scope.md`,
`docs/API/api-index.md`, `docs/API/Routes/*`, and `tests/README.md` for existing test ids.

## Related Code Files
- Create: `docs/Requirements/user-stories.md`, `docs/Requirements/test-scenarios.md`, `docs/Requirements/traceability-matrix.md`
- Modify: `docs/README.md` (link the three new docs in the Requirements section)

## Implementation Steps
1. Derive `US-xx` stories from each `UC-xx` in `use-cases.md`; cross-link.
2. Build `test-scenarios.md` Given/When/Then catalog; map each `TS-xx` to story + use-case; note existing covering test file when one exists (scan `tests/vitest/**`).
3. Build `traceability-matrix.md` joining stories, use-cases, API routes (`docs/API/Routes/*`), scenarios, and test files; flag any row with no test as a GAP.
4. Add the three docs to `docs/README.md` Requirements navigation.

## Success Criteria
- [ ] `user-stories.md`, `test-scenarios.md`, `traceability-matrix.md` exist and cross-link
- [ ] Every use-case maps to >=1 user story and >=1 test scenario
- [ ] Traceability matrix lists every API route from `api-index.md` and marks untested rows GAP
- [ ] All three are linked from `docs/README.md`

## Risk Assessment
Low-medium. Risk = matrix drifting from reality / inventing coverage. Mitigation: every test
file cell must reference a real path under `tests/`; unverified rows marked GAP, not "covered".
