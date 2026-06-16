---
phase: 3
title: "Remove reaper + legacy cleanup"
status: pending
priority: P2
effort: "2h"
dependencies: [1, 2]
---

# Phase 3: Remove reaper + legacy cleanup

## Overview
Delete the now-dead read-time orphan reaper and the unused server actions/helpers/
constant, and purge any legacy `generating` rows left in the database from the old
flow. After this phase there is no code path that writes or heals a `generating`
row server-side.

## Requirements
- Functional: `fetchStudioArtifacts` returns rows with no mutation — drop the
  orphan-detection `deleteMany` block. (Optionally filter out any stray non-`done`
  rows defensively until legacy data is purged.)
- Functional: remove unused exports: `createStudioArtifact`,
  `completeStudioArtifact`, `deleteStudioArtifact` (verify no other callers),
  `studioCreateArtifactAction`, `studioCompleteArtifactAction`,
  `studioDeleteArtifactAction`.
- Functional: remove `GENERATING_ARTIFACT_ORPHAN_TIMEOUT_MS`. Keep `generating`/
  `failed` in the client `StudioArtifactStatus` type (still used in memory).
- Functional: one-off cleanup of legacy `generating` rows (decision pending: Prisma
  migration vs throwaway local script — see Risk).

## Architecture
- `fetchStudioArtifacts` becomes a pure read (`findMany` + `toStudioArtifact`),
  keeping the `quizResult` include and ordering.
- Dead-code removal is gated on a usage grep (`rg`) to confirm zero references
  before deleting each symbol.

## Related Code Files
- Modify: `src/lib/study/passage/studio-artifacts-service.ts` — remove reaper +
  unused helpers.
- Modify: `src/features/study/actions/studio-artifact-actions.ts` — remove unused
  actions (keep `studioLoadArtifactDetailAction`, `studioRecordQuizResultAction`,
  `studioResetQuizResultAction`).
- Modify: `src/lib/study/shared/studio-artifact-types.ts` — remove orphan-timeout
  constant + stale comment block referencing the reaper.
- Create: `prisma/migrations/<ts>_purge_legacy_generating_artifacts/migration.sql`
  OR `scripts/purge-legacy-generating-artifacts.ts` (per decision).
- Read for context: callers of each removed symbol (grep first).

## Implementation Steps
1. `rg` each candidate symbol across `src/` + `tests/`; confirm only the
   generation path / its tests reference them.
2. Remove the reaper block from `fetchStudioArtifacts`.
3. Remove the unused service helpers + server actions + the timeout constant.
4. Add the legacy-row cleanup (migration or script per decision below).
5. `pnpm run typecheck` + `pnpm run lint`.

## Success Criteria
- [ ] `fetchStudioArtifacts` performs no writes.
- [ ] No references remain to the removed symbols (grep clean).
- [ ] Legacy `generating` rows are purged locally; fresh DB never accumulates them.
- [ ] typecheck + lint clean.

## Risk Assessment
- **Removing a symbol still used elsewhere** → grep-gate before each deletion.
- **Cleanup mechanism (OPEN QUESTION):** Prisma migration (versioned, runs in every
  env, durable) vs throwaway local script (the crash is local-only per user). Default
  recommendation: a small idempotent migration `DELETE FROM studio_artifacts WHERE
  status = 'generating'` so all environments converge. Confirm with user before
  writing.
