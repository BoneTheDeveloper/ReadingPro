"use client";

/**
 * Module-level cache strategy:
 *
 * `artifact-cache.ts` holds a `Map<passageId, CacheEntry>` at module scope.
 * This survives `StudyWorkspace` remounts — the study page is `force-dynamic`
 * and would otherwise wipe the cache on every navigation.
 *
 * This hook reads from the store via `useSyncExternalStore` and delegates
 * fetches to the cache's `fetchIfStale`.  `setArtifacts` mutates the
 * entry's artifacts array in-place and notifies subscribers so all mounted
 * instances of this hook re-render together.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { getArtifactQuestionsAction } from "@/features/studio-panel/server/actions/artifact";
import {
  fetchIfStale,
  getEntry,
  getSnapshot,
  subscribe,
  updateEntryArtifacts,
  type Status,
} from "@/features/studio-panel/utils/artifact-cache";
import type {
  ArtifactRef,
  ArtifactDetailCacheEntry,
  StudioArtifact,
  StudioPanelView,
} from "@/features/studio-panel/schemas/studio-panel";
interface UseStudioArtifactQueryOptions {
  passageId: string | null;
}

export function useStudioArtifactQuery({
  passageId,
}: UseStudioArtifactQueryOptions) {
  // Subscribe to the module-level store version counter.
  // Any cache mutation (fetch, evict, setArtifacts) bumps the version
  // and causes every subscribed hook instance to re-render.
  const storeVersion = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Derive current state from the store on every render.
  const entry = passageId ? getEntry(passageId) : null;
  const artifacts: StudioArtifact[] = entry?.artifacts ?? [];
  const status: Status = entry?.status ?? "idle";

  // Kick off a fetch when passageId changes and the cache is stale or empty.
  useEffect(() => {
    if (!passageId) return;
    fetchIfStale(passageId);
  }, [passageId]);

  // `view` and `artifactDetailById` are local to the hook instance —
  // keyed by artifact id (not passage), session-scoped to the panel.
  const [view, setView] = useState<StudioPanelView>(null);
  const [artifactDetailById, setArtifactDetailById] = useState<
    Record<string, ArtifactDetailCacheEntry>
  >({});

  // Lazy-load artifact detail when opening artifact.
  // Kept in the hook's closure — no module-level cache needed here.
  const setViewWithFetch = useCallback(
    async (next: StudioPanelView) => {
      setView(next);

      if (!next || next.mode !== "artifact") return;
      const ref: ArtifactRef = next.ref;
      if (artifactDetailById[ref.id]) return;

      try {
        const result = await getArtifactQuestionsAction(ref.id);
        setArtifactDetailById((prev) => ({
          ...prev,
          [ref.id]: result,
        }));
      } catch {
        // Silently fail — artifact detail loading is non-critical
      }
    },
    [artifactDetailById],
  );

  /**
   * in-place and notifies subscribers so all hook instances stay in sync.
   */
  const setArtifacts = useCallback(
    (updater: StudioArtifact[] | ((prev: StudioArtifact[]) => StudioArtifact[])) => {
      if (!passageId) return;
      const current = getEntry(passageId).artifacts;
      const next = typeof updater === "function" ? updater(current) : updater;
      updateEntryArtifacts(passageId, next);
    },
    [passageId],
  );

  void storeVersion; // subscription side-effect only; value is never read

  return {
    artifacts,
    setArtifacts,
    status,
    view,
    setView: setViewWithFetch,
    artifactDetailById,
  };
}
