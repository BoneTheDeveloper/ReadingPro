---
phase: 3
title: Docs sync and verification
status: completed
priority: P2
effort: 1h
dependencies:
  - 2
---

# Phase 3: Docs sync and verification

## Overview

Flip the docs from current URLs to the new `/api/study/*` URLs in lockstep with the
moved routes, retire the now-completed "Planned URL Consolidation" table, and run a
final whole-repo consistency sweep so docs and code agree.

## Requirements

- Functional: every documented Study URL matches the live route.
- Non-functional: no doc references a `study-chat|study-session|studio-*` URL except
  the historical changelog entry (intentionally preserved as a record).

## Architecture

Docs were already restructured by domain. This phase only changes the URL strings
inside them and removes the migration table that described this very refactor.

## Related Code Files

- Modify: `docs/API/Routes/study/chat.md` (routes table, examples → `/api/study/chat`)
- Modify: `docs/API/Routes/study/sessions.md` (`POST /api/study/sessions`)
- Modify: `docs/API/Routes/study/questions.md` (`POST /api/study/questions`)
- Modify: `docs/API/Routes/study/artifacts.md` (`/api/study/artifacts*`, incl. quiz-result)
- Modify: `docs/API/Routes/study/README.md` (sub-resource routes table)
- Modify: `docs/API/api-index.md` (Study domain table → new URLs; **remove** the
  "Planned URL Consolidation" section, now done)
- Modify: `docs/codebase-summary.md` (Feature Cross-reference `Routes` column for
  study workspace / chat / artifacts rows: `src/app/api/study/*`)
- Modify: `tests/performance/query-budget-benchmarks.md` (table rows `POST /api/study/chat`, `POST /api/study/sessions`)
- Do NOT modify: `docs/Product/changelog.md` (historical record).

## Implementation Steps

1. Update each `docs/API/Routes/study/*.md` route table and inline `http` examples
   to the new URLs.
2. Update `docs/API/api-index.md` Study table; delete the "Planned URL Consolidation"
   section and the reference to it from `study/README.md`.
3. Update `docs/codebase-summary.md` Routes column for the three study rows.
4. Update `tests/performance/query-budget-benchmarks.md` URL rows.
5. Whole-repo sweep: `rg "/api/study-chat|/api/study-session|/api/studio-"` over the
   repo → only `docs/Product/changelog.md` may match.
6. Link check: `rg "Routes/study(-|/)" docs` resolves to existing files.
7. Final gate: `pnpm typecheck && pnpm lint && pnpm test`.

## Success Criteria

- [ ] All Study docs show `/api/study/*` URLs matching live routes.
- [ ] "Planned URL Consolidation" section removed from `api-index.md`.
- [ ] `codebase-summary.md` and benchmark doc updated.
- [ ] Repo-wide rg finds old URLs only in `changelog.md`.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass.

## Risk Assessment

- **Risk:** doc drift if Phase 2 missed a route. **Mitigation:** step 5 sweep is the
  same gate as Phase 2 step 6, re-run repo-wide here.
- **Risk:** breaking an internal doc link. **Mitigation:** step 6 link check.
