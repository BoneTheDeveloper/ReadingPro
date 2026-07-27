---
phase: 2
title: "Verify cache + trace fan-out"
status: in-progress
priority: P1
effort: "0.5h"
dependencies: [1]
---

# Phase 2: Verify cache + trace fan-out

## Overview

Confirm Phase 1's cache behavior end-to-end and resolve the Bug 2 fan-out question. Wrap up with a manual regression pass on the existing question mutation flow.

## Requirements

- Functional:
  - Manual recording of cache hits / misses across navigation patterns.
  - Empirical identification of the fan-out source (if any).
  - End-to-end pass on question creation, in-progress, completion, score recording, and delete.
- Non-functional:
  - No new telemetry beyond a one-shot `Sentry.addBreadcrumb` (removed after diagnosis).

## Architecture

No new architecture. Phase 2 is empirical verification + minimal scoping fix.

## Related Code Files

- Modify (data-gathering only, then revert): `src/features/studio-panel/server/services/studio-artifacts.ts`
- Possibly modify (if fan-out confirmed): `src/features/studio-panel/hooks/use-question-mutation.ts`
- Read for verification: `src/features/studio-panel/components/studio-panel.tsx`, `src/features/studio-panel/components/studio/default-studio-view.tsx`

## Implementation Steps

1. **Cache verification matrix**
   - Open `/study` with a passage that has 1+ artifacts. Note the network panel.
   - Navigate to `/dashboard`. Return to `/study`. Confirm zero new `getStudioArtifactsAction`.
   - Hard-reload. Confirm exactly one fetch for the active passage.
   - Switch to a different passage. Confirm exactly one fetch for the new passage.
   - Wait 60s. Switch back. Confirm exactly one fetch for the older passage.

2. **Fan-out trace**
   - Add a temporary `Sentry.addBreadcrumb({ category: "artifact.fetch", data: { passageId } })` at the top of `fetchStudioArtifacts` in `src/features/studio-panel/server/services/studio-artifacts.ts`.
   - Reproduce the symptom: open `/study`, watch Sentry for events.
   - If multiple `passageId` values appear in one boot, the fan-out is real. Identify the caller (search `useQuestionMutation`, `useStudyWorkspaceState`, any `useEffect`).
   - If only the active `passageId` appears, the original report was a misread — Phase 2 closes without changes.

3. **Fan-out mitigation** (only if Step 2 confirms)
   - Gate `useQuestionMutation.handleActionClick` on resolved `passageId`.
   - Confirm `findStudioArtifacts(userId, undefined)` cannot be reached (Prisma would reject undefined; even if it didn't, the cache would receive a `null` key).
   - If a multi-passage fetch is intentional (e.g., bulk regeneration), keep it but rename the cache key to `bulk:${userId}` and add a comment.

4. **Regression pass**
   - Start a question on a passage; wait for `done`; open the artifact; record a result; delete.
   - Verify mutations update the cache entry in place (no full refetch).

5. **Cleanup**
   - Remove the `Sentry.addBreadcrumb` debug line.
   - Confirm `pnpm typecheck && pnpm lint && pnpm knip` green.

## Success Criteria

- [ ] Cache verification matrix passes all five cases.
- [ ] Fan-out diagnosis recorded in the phase report (or: "no fan-out found").
- [ ] If a fan-out was found, the trigger is gated and reproduction no longer triggers it.
- [ ] Question mutation flow works end-to-end without redundant network calls.
- [ ] Breadcrumb lines removed; no leftover debug logs.

## Risk Assessment

- **False positive in fan-out trace**: A breadcrumb on every fetch is noisy if the fetch is hot. Limit to 5 minutes during diagnosis; if not resolved, escalate to a `Sentry` span instead.
- **Cache poisoning from mutation**: `useQuestionMutation.setArtifacts` mutates the entry's array. If the cache reflects a `done` artifact and the in-flight generation completes, the local array now shadows reality until TTL. Mitigated by `useQuestionMutation` already appending the new artifact; any background refresh that arrives after must be ignored. Phase 2 verifies this by replaying the race.
- **Backward compat**: Removing the breadcrumb is straightforward; no production impact.
