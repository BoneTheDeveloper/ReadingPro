"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { getArtifactQuestionsAction, getStudioArtifactsAction } from "@/features/studio-panel/server/actions/artifact";
import type {
  ArtifactRef,
  ArtifactDetailCacheEntry,
  StudioArtifact,
  StudioPanelView,
} from "@/features/studio-panel/schemas/studio-artifact";

const ARTIFACT_STALE_TIME = 60_000;

type ArtifactQueryStatus = "idle" | "loading" | "success" | "error";

interface UseStudioArtifactQueryOptions {
  passageId: string | null;
}

export function useStudioArtifactQuery({
  passageId,
}: UseStudioArtifactQueryOptions) {
  const [artifacts, setArtifacts] = useState<StudioArtifact[]>([]);
  const [status, setStatus] = useState<ArtifactQueryStatus>("idle");
  const [view, setView] = useState<StudioPanelView>(null);
  const [artifactDetailById, setArtifactDetailById] = useState<
    Record<string, ArtifactDetailCacheEntry>
  >({});

  const fetchedAtRef = useRef<number | null>(null);
  const passageIdRef = useRef<string | null>(passageId);
  const isMountedRef = useRef(false);

  // Reset state when passageId changes
  useEffect(() => {
    if (passageId === passageIdRef.current && isMountedRef.current) return;
    passageIdRef.current = passageId;
    isMountedRef.current = true;

    setArtifacts([]);
    setStatus("idle");
    setView(null);
    fetchedAtRef.current = null;
  }, [passageId]);

  // Fetch artifacts
  useEffect(() => {
    const pid = passageIdRef.current;
    if (!pid) return;
    if (status === "loading") return;
    if (
      status === "success" &&
      fetchedAtRef.current &&
      Date.now() - fetchedAtRef.current < ARTIFACT_STALE_TIME
    ) {
      return;
    }

    setStatus("loading");

    getStudioArtifactsAction(pid)
      .then(({ artifacts: fetchedArtifacts }) => {
        if (passageIdRef.current !== pid) return;
        setArtifacts(fetchedArtifacts);
        setStatus("success");
        fetchedAtRef.current = Date.now();
      })
      .catch((err) => {
        if (passageIdRef.current !== pid) return;
        Sentry.captureException(err, {
          tags: { scope: "study.fetch-artifacts" },
          extra: { passageId: pid },
        });
        setStatus("error");
      });
  }, [passageId, status]);

  // Lazy-load artifact detail when opening artifact
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
        // Silently fail - artifact detail loading is non-critical
      }
    },
    [artifactDetailById],
  );

  return {
    artifacts,
    setArtifacts,
    status,
    view,
    setView: setViewWithFetch,
    artifactDetailById,
  };
}
