---
phase: 4
title: "Tests and docs"
status: pending
priority: P2
effort: "3h"
dependencies: [1, 2, 3]
---

# Phase 4: Tests and docs

## Overview
Update and add tests for the atomic flow, and rewrite the docs that describe the
(now removed) orphan-recovery lifecycle.

## Requirements
- Functional: tests prove atomicity, idempotency, in-memory-only generating state,
  and that no reaper/`generating` persistence remains.
- Functional: docs reflect the new single-transaction lifecycle; the
  orphan-recovery section is removed/replaced.

## Architecture
- Service test: a generation failure persists nothing; success persists artifact +
  questions together; duplicate `artifactId` returns existing.
- Route contract test: response includes `artifact` + `questions`; error codes
  unchanged (400/401/404/502/500).
- Hook/integration test: optimistic card is in-memory; on success it becomes
  `done` with cached questions; on failure it disappears with a retry banner;
  reload shows no generating card.
- Remove/replace the orphan-delete test in `studio-artifacts-service.test.ts`.

## Related Code Files
- Modify: `tests/vitest/integration/api/studio-questions-route.test.ts`
- Modify: `src/lib/study/passage/studio-artifacts-service.test.ts` (drop reaper test)
- Modify: `src/features/study/hooks/use-study-actions.test.ts`
- Modify: `tests/vitest/integration/components/study/study-page-client.integration.test.tsx`
- Modify (new service test if absent): `passage-study.service` atomic/idempotent.
- Modify: `docs/API/Routes/studio-artifacts-feature.md` — remove "Orphaned
  Generation Recovery"; replace lifecycle with the atomic flow + "no persisted
  generating state".
- Modify: `docs/API/Routes/studio-questions-feature.md` — note it now creates the
  artifact + returns it.

## Implementation Steps
1. Update route + service tests for the `{artifact, questions}` shape, atomicity,
   idempotency, and no-persist-on-failure.
2. Remove the orphan-reaper test; add a "no write on read" assertion if useful.
3. Update hook + integration tests for the in-memory optimistic flow and the
   reload-shows-no-spinner behavior.
4. Rewrite the two docs sections.
5. Run the full suite + typecheck + lint.

## Success Criteria
- [ ] Full vitest suite green.
- [ ] typecheck + lint clean.
- [ ] Docs describe the atomic lifecycle; no stale orphan-recovery / 5-min-timeout
      / reaper references remain in `docs/`.

## Risk Assessment
- **Stale assertions** in existing tests referencing `generating` persistence or
  the reaper → update or delete them; do not leave skipped tests.
- **Doc drift** → grep `docs/` for `orphan`, `GENERATING_ARTIFACT_ORPHAN`,
  `reaper`, `generating` to catch every reference.
