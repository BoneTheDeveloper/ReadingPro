"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import type { ArtifactsCacheEntry } from "@/features/studio-panel/actions";
import { ARTIFACT_STALE_TIME } from "@/features/studio-panel/lib/studio-artifact-types";
import { getStudioArtifactsAction } from "@/features/studio-panel/actions";
import type { Dispatch, SetStateAction } from "react";
import type { StudyState } from "@/app/[locale]/(dashboard)/study/_hooks/use-study-workspace-state";

type ArtifactsState = Record<string, ArtifactsCacheEntry>;

interface UseStudyArtifactsInput {
  activePassageId: string | null;
  artifactsByPassageId: ArtifactsState;
  setState: Dispatch<SetStateAction<StudyState>>;
}

export function useStudyArtifacts({
  activePassageId,
  artifactsByPassageId,
  setState,
}: UseStudyArtifactsInput) {
  useEffect(() => {
    if (!activePassageId) return;

    const passageId = activePassageId;
    const cached = artifactsByPassageId[passageId];

    // Skip if: already cached fresh, OR a fetch is already in-flight (prevents double-fetch
    // when React Strict Mode or rapid state changes trigger the effect multiple times).
    if (
      cached?.status === "success" &&
      cached.fetchedAt &&
      Date.now() - cached.fetchedAt < ARTIFACT_STALE_TIME
    )
      return;
    if (cached?.status === "loading") return;

    setState((prev) => ({
      ...prev,
      artifactsByPassageId: {
        ...prev.artifactsByPassageId,
        [passageId]: { status: "loading", data: cached?.data ?? [] },
      },
    }));

    getStudioArtifactsAction(passageId)
      .then(({ artifacts }) => {
        setState((prev) => {
          if (prev.activePassageId !== passageId) return prev;
          return {
            ...prev,
            artifactsByPassageId: {
              ...prev.artifactsByPassageId,
              [passageId]: {
                status: "success",
                data: artifacts,
                fetchedAt: Date.now(),
              },
            },
          };
        });
      })
      .catch((err) => {
        Sentry.captureException(err, {
          tags: { feature: "study", action: "fetch-artifacts" },
          extra: { passageId },
        });
        setState((prev) => {
          if (prev.activePassageId !== passageId) return prev;
          return {
            ...prev,
            artifactsByPassageId: {
              ...prev.artifactsByPassageId,
              [passageId]: {
                status: "error",
                data: cached?.data ?? [],
                error:
                  err instanceof Error
                    ? err.message
                    : "Failed to fetch artifacts",
              },
            },
          };
        });
      });
  }, [activePassageId, artifactsByPassageId, setState]);
}
