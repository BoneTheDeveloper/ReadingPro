"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { getArtifactQuestionsAction } from "@/features/studio-panel/server/actions/artifact";
import { getStudioArtifactsAction } from "@/features/studio-panel/server/actions/artifact";
import type {
  ArtifactRef,
  ArtifactDetailCacheEntry,
  StudioArtifact,
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
  const [viewingArtifact, setViewingArtifact] = useState<ArtifactRef | null>(
    null,
  );
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
    setViewingArtifact(null);
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
  const openArtifact = useCallback(
    async (ref: ArtifactRef | null) => {
      setViewingArtifact(ref);

      if (!ref || artifactDetailById[ref.id]) return;

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
    viewingArtifact,
    artifactDetailById,
    setViewingArtifact: openArtifact,
  };
}
