---
phase: 1
title: "Module-level cache + useSyncExternalStore"
status: completed
priority: P1
effort: "1.5h"
dependencies: []
---

# Phase 1: Module-level cache + useSyncExternalStore

## Overview

Promote the per-passage artifact cache out of the component into a module-level store exposed through `useSyncExternalStore`. After this phase, navigating away from `/study` and back renders the artifact list instantly for any passage whose data is still warm.

## Requirements

- Functional:
  - Cache survives `StudyWorkspace` unmount; visible to the next mount on the same browser page.
  - Stale window honored (`ARTIFACT_STALE_TIME = 60_000`).
  - Concurrent mounts of the same `passageId` share one in-flight fetch (dedupe).
  - Snapshot selectors are reference-stable when nothing changes for the requested `passageId`.
  - `status` flips to `loading` only when an actual fetch is kicked off (not on cache hit).
- Non-functional:
  - No new dependency.
  - No changes to user-visible behavior in the loading or error paths.
  - Memory bounded by TTL eviction on read + a 5-min interval.

## Architecture

`src/features/studio-panel/utils/artifact-cache.ts` (new file — plain module-level store, not a hook):

```ts
"use client";

import { getStudioArtifactsAction } from "@/features/studio-panel/server/actions/artifact";
import type { StudioArtifact } from "@/features/studio-panel/schemas/studio-panel";
const TTL_MS = 60_000;
const EVICT_INTERVAL_MS = 5 * 60_000;

type Status = "idle" | "loading" | "success" | "error";
interface CacheEntry {
  artifacts: StudioArtifact[];
  status: Status;
  fetchedAt: number | null;
  inflight?: Promise<void>;
}

const store = new Map<string, CacheEntry>();
const listeners = new Set<() => void>();
let version = 0;
let evictTimer: ReturnType<typeof setInterval> | null = null;

function notify() { version++; listeners.forEach((l) => l()); }
function get(passageId: string): CacheEntry {
  let entry = store.get(passageId);
  if (!entry) { entry = { artifacts: [], status: "idle", fetchedAt: null }; store.set(passageId, entry); }
  return entry;
}
function evict() {
  const now = Date.now();
  for (const [id, entry] of store) {
    if (entry.status !== "loading" && entry.fetchedAt && now - entry.fetchedAt > TTL_MS) {
      store.delete(id);
      notify();
    }
  }
}
function ensureEvictTimer() {
  if (evictTimer) return;
  if (typeof window === "undefined") return; // safe: only runs in client mount
  evictTimer = setInterval(evict, EVICT_INTERVAL_MS);
}

export function getEntry(passageId: string): CacheEntry { return get(passageId); }
export function subscribe(listener: () => void): () => void {
  ensureEvictTimer();
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function getSnapshot(): number { return version; }
```

`use-studio-artifact-query.ts` (modify):

```ts
export function useStudioArtifactQuery({ passageId }: { passageId: string | null }) {
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Read state once per render from store; component-local React state is gone.
  const entry = passageId ? getEntry(passageId) : null;

  useEffect(() => {
    if (!passageId) return;
    const e = getEntry(passageId);
    if (e.status === "loading") return;
    if (e.status === "success" && e.fetchedAt && Date.now() - e.fetchedAt < TTL_MS) return;

    e.status = "loading";
    notifyEntry(passageId); // local notify that bumps version for this entry only

    const p = getStudioArtifactsAction(passageId)
      .then(({ artifacts }) => {
        if (getEntry(passageId) !== e) return; // stale
        e.artifacts = artifacts;
        e.status = "success";
        e.fetchedAt = Date.now();
        notifyEntry(passageId);
      })
      .catch((err) => {
        if (getEntry(passageId) !== e) return;
        e.status = "error";
        notifyEntry(passageId);
        Sentry.captureException(err, { tags: { scope: "study.fetch-artifacts" }, extra: { passageId } });
      })
      .finally(() => { e.inflight = undefined; });

    e.inflight = p;
  }, [passageId]);

  // ... `setViewWithFetch` and `artifactDetailById` lifted to a separate per-id Map likewise
  //      (or kept local; see below).
}
```

Notes:
- `getSnapshot` returns the version number; the hook re-derives `entry` on each render. To avoid React tearing, the hook uses `useSyncExternalStore` *only* for the version bump, and reads `entry` directly. Acceptable because the store is in-process and synchronous.
- For `useMemo` correctness, split selectors: `useStudioArtifacts(passageId)` returns references only when the entry's `artifacts` array changes; `useStudioStatus(passageId)` returns the status. Both consume the same `version` snapshot.
- Keep `artifactDetailById` local to the hook instance unless it benefits from caching. **Decision:** keep local — it is keyed by artifact id (not passage), already session-scoped to the panel, and the open/close rhythm is panel-local. Documented in the diff.

## Related Code Files

- Modify: `src/features/studio-panel/hooks/use-studio-artifact-query.ts`
- Create: `src/features/studio-panel/utils/artifact-cache.ts` (plain module — exports `getEntry`, `subscribe`, `getSnapshot`, `notifyEntry`. No `use*` calls.)
- Read for context: `src/features/studio-panel/components/studio-panel.tsx`, `src/features/studio-panel/server/actions/artifact.ts`

## Implementation Steps

1. Create `artifact-cache.ts` with the module-level store, listener set, version counter, TTL eviction, and a small `getEntry / subscribe / getSnapshot` API.
2. Split the hook into two selector readouts (`useStudioArtifacts`, `useStudioStatus`) so consumers re-render only on the field they read. Both share the same `useSyncExternalStore` subscription.
3. Replace the dual-`useEffect` (state-reset + fetch) in `useStudioArtifactQuery` with a single effect that defers to the cache entry's status.
4. Preserve the existing return shape `{ artifacts, setArtifacts, status, view, setView, artifactDetailById }` so `study-workspace.tsx` and `studio-panel.tsx` need no changes.
5. Add a small inline comment at the top of `use-studio-artifact-query.ts` explaining why the cache is module-scoped (to survive `force-dynamic` page remounts).

## Success Criteria

- [ ] `pnpm typecheck && pnpm lint && pnpm knip` green.
- [ ] DevTools Network: navigating to `/study`, then `/dashboard`, then `/study` again results in **zero** `getStudioArtifactsAction` calls for the previously-active passage (assuming <60s).
- [ ] Selecting a *different* passage triggers exactly one fetch for the new passage.
- [ ] Forcing a `Server Error` on the server action surfaces in `status === "error"` and does not corrupt the cache for other passages.
- [ ] No new dependency in `package.json`.

## Risk Assessment

- **Tearing risk**: `useSyncExternalStore` requires a stable `getSnapshot`. Returning the version number is fine; reads of `entry.artifacts` are pull-based per render. Documented in code.
- **Memory growth**: Mitigated by TTL eviction on read + 5-min interval. No hard cap needed because the map only grows for touched passages.
- **SSR**: hooks file is `"use client"`; the loader's `setInterval` is guarded by `typeof window !== "undefined"` inside `ensureEvictTimer`.
- **Concurrent fetch dedupe**: the `inflight` promise is shared between mounts of the same `passageId`. The `.then` checks `getEntry(passageId) === e` to drop stale resolve.
- **Mutation race**: `useQuizMutation.setArtifacts` mutates the local array via `setArtifacts`. After Phase 1, this still works because the hook returns the same `setArtifacts` setter that mutates the entry's `artifacts` array and calls `notifyEntry(passageId)`. Verified by Phase 2 manual pass.
