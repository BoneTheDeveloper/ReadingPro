"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Dispatch, SetStateAction } from "react";
import { generateStudioQuestions } from "@/features/studio-panel/services/studio-questions-service";
import { getArtifactQuestionsAction } from "@/features/studio-panel/actions";
import type {
  ArtifactsCacheEntry,
  ArtifactRef,
  StudioActionId,
} from "@/features/studio-panel/actions";
import type { PassageData } from "@/features/passage/schemas/passage.schema";
import type { StudioArtifact, StudioArtifactErrorCode } from "@/features/studio-panel/lib/studio-artifact-types";
import type { StudyState } from "./use-study-workspace-state";

interface UseStudyActionsInput {
  state: StudyState;
  setState: Dispatch<SetStateAction<StudyState>>;
  passages: PassageData[];
}

export function useStudyActions({ state, setState, passages }: UseStudyActionsInput) {
  const t = useTranslations("Study");
  const activePassageIdRef = useRef(state.activePassageId);
  // Guards against re-entrant retries of the same artifact (e.g. a fast
  // double-click), which would otherwise re-create the same id twice.
  const retryingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activePassageIdRef.current = state.activePassageId;
  }, [state.activePassageId]);

  const updateCacheEntry = useCallback(
    (
      passageId: string,
      updater: (entry: ArtifactsCacheEntry) => ArtifactsCacheEntry,
    ) => {
      setState((prev) => ({
        ...prev,
        artifactsByPassageId: {
          ...prev.artifactsByPassageId,
          [passageId]: updater(
            prev.artifactsByPassageId[passageId] ?? {
              status: "idle",
              data: [],
            },
          ),
        },
      }));
    },
    [setState],
  );

  const updateArtifactStatus = useCallback(
    (passageId: string, artifactId: string, patch: Partial<StudioArtifact>) => {
      updateCacheEntry(passageId, (entry) => ({
        ...entry,
        data: entry.data.map((r) =>
          r.id === artifactId ? { ...r, ...patch } : r,
        ),
      }));
    },
    [updateCacheEntry],
  );

  // Marks the artifact failed in client state only — there is no persisted row to
  // clean up since the atomic generation either committed or rolled back entirely.
  const failQuizArtifact = useCallback(
    (
      passageId: string,
      artifactId: string,
      errorCode: StudioArtifactErrorCode,
      errorDetail?: string,
    ) => {
      if (activePassageIdRef.current === passageId) {
        setState((prev) => ({
          ...prev,
          error: errorDetail ?? t("generationFailed"),
        }));
      }
      updateArtifactStatus(passageId, artifactId, {
        status: "failed",
        errorCode,
        errorDetail,
      });
    },
    [setState, t, updateArtifactStatus],
  );

  const generateQuizArtifact = useCallback(
    async (passageId: string, artifactId: string) => {
      try {
        const result = await generateStudioQuestions({ passageId, artifactId });
        if ("error" in result) {
          failQuizArtifact(passageId, artifactId, result.code, result.error);
          return;
        }
        // Success: swap optimistic card with the server's committed artifact and
        // cache questions. Targets the originating passage so a valid quiz is
        // never discarded when the user switches passages mid-generation.
        updateArtifactStatus(passageId, artifactId, {
          ...result.artifact,
          errorCode: undefined,
          errorDetail: undefined,
        });
        setState((prev) => ({
          ...prev,
          artifactDetailById: {
            ...prev.artifactDetailById,
            [artifactId]: { questions: result.questions },
          },
        }));
      } catch (err) {
        failQuizArtifact(
          passageId,
          artifactId,
          "UNKNOWN",
          err instanceof Error ? err.message : undefined,
        );
      }
    },
    [failQuizArtifact, setState, updateArtifactStatus],
  );

  // Re-runs generation on a failed card. The optimistic card already has the right
  // id; just reset it to generating and re-POST. The server's idempotency guard
  // handles the case where the first attempt actually committed successfully.
  const retryQuizArtifact = useCallback(
    async (artifactId: string) => {
      const passageId = activePassageIdRef.current;
      if (!passageId) return;
      if (!passages.find((item) => item.id === passageId)) return;
      if (retryingIdsRef.current.has(artifactId)) return;
      retryingIdsRef.current.add(artifactId);

      updateArtifactStatus(passageId, artifactId, {
        status: "generating",
        errorCode: undefined,
        errorDetail: undefined,
      });

      try {
        await generateQuizArtifact(passageId, artifactId);
      } finally {
        retryingIdsRef.current.delete(artifactId);
      }
    },
    [passages, updateArtifactStatus, generateQuizArtifact],
  );

  const handleActionClick = useCallback(
    async (actionId: StudioActionId) => {
      const passageId = activePassageIdRef.current;
      if (!passageId) return;
      const passage = passages.find((item) => item.id === passageId);
      if (!passage) return;

      if (actionId !== "quiz") return;

      const artifactId = crypto.randomUUID();

      // Optimistic card lives in memory only — the server atomically creates the
      // artifact + questions together on success. A reload before that shows nothing
      // (correct: no partial DB state exists). A reload after shows the done quiz.
      const optimistic: StudioArtifact = {
        id: artifactId,
        type: "quiz",
        passageId,
        title: passage.title,
        status: "generating",
        createdAt: new Date().toISOString(),
      };

      updateCacheEntry(passageId, (entry) => ({
        ...entry,
        data: [optimistic, ...entry.data],
      }));

      await generateQuizArtifact(passageId, artifactId);
    },
    [generateQuizArtifact, passages, updateCacheEntry],
  );

  // Lazy-loads artifact detail when the user opens an artifact that isn't in state yet.
  const handleViewArtifact = useCallback(
    async (ref: ArtifactRef | null, passageId: string) => {
      setState((prev) => ({
        ...prev,
        viewingArtifactByPassageId: {
          ...prev.viewingArtifactByPassageId,
          [passageId]: ref,
        },
      }));

      if (!ref || state.artifactDetailById[ref.id]) return;

      try {
        const result = await getArtifactQuestionsAction(ref.id);

        setState((prev) => ({
          ...prev,
          artifactDetailById: {
            ...prev.artifactDetailById,
            [ref.id]: result,
          },
        }));
      } catch {
        // Silently fail or handle error state
      }
    },
    [setState, state.artifactDetailById],
  );

  const handleRecordQuizResult = useCallback(
    (
      passageId: string,
      artifactId: string,
      stats: { correctCount: number; totalQuestions: number },
    ) => {
      updateArtifactStatus(passageId, artifactId, {
        quizResult: {
          completedAt: new Date().toISOString(),
          correctCount: stats.correctCount,
          totalQuestions: stats.totalQuestions,
          accuracyRate:
            stats.totalQuestions > 0
              ? Math.round((stats.correctCount / stats.totalQuestions) * 100) /
                100
              : 0,
        },
      });
    },
    [updateArtifactStatus],
  );

  const handleResetQuizResult = useCallback(
    (passageId: string, artifactId: string) => {
      updateArtifactStatus(passageId, artifactId, {
        quizResult: undefined,
      });
    },
    [updateArtifactStatus],
  );

  return {
    handleActionClick,
    handleViewArtifact,
    handleRecordQuizResult,
    handleResetQuizResult,
    retryQuizArtifact,
  };
}
