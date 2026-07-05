"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import type {
  StudioArtifact,
  ArtifactsCacheEntry,
  StudyState,
} from "../../shared/types";
import { ARTIFACT_STALE_TIME } from "../../shared/types";
import { STUDY_API_ROUTES } from "@/features/study/shared/api-utils";
import type { Dispatch, SetStateAction } from "react";

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

    const controller = new AbortController();

    setState((prev) => ({
      ...prev,
      artifactsByPassageId: {
        ...prev.artifactsByPassageId,
        [passageId]: { status: "loading", data: cached?.data ?? [] },
      },
    }));

    fetch(`${STUDY_API_ROUTES.artifacts}?passageId=${passageId}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`Failed to fetch study artifacts (${r.status})`);
        }
        return (await r.json()) as { data?: { artifacts?: StudioArtifact[] } };
      })
      .then((json) => {
        setState((prev) => {
          if (prev.activePassageId !== passageId) return prev;
          return {
            ...prev,
            artifactsByPassageId: {
              ...prev.artifactsByPassageId,
              [passageId]: {
                status: "success",
                data: json.data?.artifacts ?? [],
                fetchedAt: Date.now(),
              },
            },
          };
        });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
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

    return () => controller.abort();
  }, [activePassageId, artifactsByPassageId, setState]);
}
