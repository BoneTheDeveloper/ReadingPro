---
title: "Studio Artifact Row Cache"
description: "Module-level per-passage cache for ArtifactRow so navigating to /study does not refetch unchanged artifact lists."
status: pending
priority: P1
effort: "2h"
branch: preview
tags: [frontend, performance, studio-panel]
blockedBy: []
blocks: []
created: 2026-07-26
---

# Studio Artifact Row Cache

## Overview

Replace the component-local stale-time guard in `useStudioArtifactQuery` with a module-level per-passage cache exposed through `useSyncExternalStore`. After the change, navigating away from `/study` and back renders the artifact list instantly for any passage whose data is still warm, and the server only sees one `getStudioArtifactsAction` call per passage per stale window.

## Context

- Symptom (Bug 1): navigating to the study page always re-fetches artifacts. The hook lives inside `StudyWorkspace` (`src/app/(dashboard)/study/_components/study-workspace.tsx:36`); `study/page.tsx` is `force-dynamic` and re-renders the client tree on every navigation, so component-local `useState` / `useRef` cache is wiped.
- Symptom (Bug 2): a single navigation triggers fetches for *all* passages instead of only the active one. The hook is keyed by `state.activePassageId` (single id), so the fan-out is not in the hook's call shape — it is in `useQuestionMutation` or a sibling effect. Phase 2 traces this empirically.
- Chosen direction: Option A from the brainstorm — module-level cache + `useSyncExternalStore`. No new dependency. Schema, server actions, and mutation flows unchanged.

## Goals

| # | Goal | Priority |
|---|------|----------|
| 1 | Per-passage cache survives `StudyWorkspace` remounts | P1 |
| 2 | Selectors stable across remounts via `useSyncExternalStore` | P1 |
| 3 | Stale time honored across navigation; no double-fetch on remount | P1 |
| 4 | No regression in `useQuestionMutation` / `ArtifactRow` / `DefaultStudioView` | P1 |
| 5 | Locate the Bug 2 fan-out source and gate it | P1 |

## Phases

| # | Phase | Status |
|---|-------|--------|
| 1 | [Module-level cache + useSyncExternalStore](./phase-01-module-cache.md) | ✅ Done |
| 2 | [Verify cache + trace fan-out](./phase-02-verify-cache-fan-out.md) | Pending |

## Architecture

```
loader (module scope)
  Map<passageId, { artifacts, fetchedAt, status, inflight?: Promise }>
  get(passageId) -> CacheEntry | undefined
  set(passageId, entry) -> bumps version
  subscribe(listener) -> cleanup
  evict(now) -> drops entries older than TTL

useStudioArtifactQuery({ passageId })
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  on passageId change, ensure entry: if fresh -> return; if stale -> fetch; if missing -> fetch
  inflight promise dedupes concurrent hits

TTL = 60s (matches current ARTIFACT_STALE_TIME)
evict on every read + every 5 min via interval registered once at module load
```

## Cross-Plan Dependencies

None. Searched existing plans in `plans/`; no overlap with `260726-1235-direct-pdf-upload`, `260726-1256-pdf-viewer-upgrade-to-react-pdf`, or `260725-2305-inngest-sse-progress`.

## Files Touched

- Modify: `src/features/studio-panel/hooks/use-studio-artifact-query.ts`
- Add: `src/features/studio-panel/utils/artifact-cache.ts` (module-level store with `getEntry`, `subscribe`, `getSnapshot` plain functions — colocated with `ai-chat-utils.ts`; not a hook because it does not call `useState` / `useEffect` / `useSyncExternalStore`)
- No changes to `default-studio-view.tsx`, `artifact-row.tsx`, server actions, prisma, or schemas.

## Success Criteria

- [ ] Network panel shows exactly one `getStudioArtifactsAction` call per passage per 60s window, even across away/back navigation.
- [ ] `ArtifactRow` renders instantly (no `loading` flash) for any passage whose cache is warm.
- [ ] Manual pass: open `/study`, navigate to `/dashboard`, return to `/study` — list of artifacts for the previously-active passage appears without a server call.
- [ ] `pnpm typecheck && pnpm lint && pnpm knip` all green.
- [ ] Question mutation flow (start, in-progress, done, record result, delete) still works end-to-end.

## Open Questions

- Where exactly is the Bug 2 fan-out originating? Solved in Phase 2.
- Should the cache survive browser tab reloads (sessionStorage)? **No** — current behavior is in-memory only and matches React conventions; a reload is a hard boundary. Confirmed by the brainstorm.
- What if the user has thousands of passages? TTL eviction keeps the map bounded to "passages touched in the last TTL"; no current need for hard caps.

## Notes

- Keep `useQuestionMutation` untouched. If Phase 2 finds the fan-out is there, gate it on resolved `passageId` rather than changing how the cache works.
- Do not introduce `useSyncExternalStore` re-render storms; the snapshot only changes when the relevant `passageId` entry changes. Other entries' updates use `getSnapshot` slicing.
- The cache store is a plain module-level value, not a hook. It lives in `lib/`. Only files starting with `use` and exporting `useX` hooks belong in `hooks/`.
