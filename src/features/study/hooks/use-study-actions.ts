"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Dispatch, SetStateAction } from "react";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import { generateStudioQuestions } from "@/features/study/api/studio-questions-client";
import {
  studioCreateArtifactAction,
  studioCompleteArtifactAction,
  studioDeleteArtifactAction,
  studioLoadArtifactDetailAction,
} from "@/features/study/actions/studio-artifact-actions";
import type {
  ArtifactsCacheEntry,
  ArtifactRef,
  StudioActionId,
  StudioArtifact,
  StudioArtifactErrorCode,
  StudyState,
} from "../model/types";

interface UseStudyActionsInput {
  state: StudyState;
  setState: Dispatch<SetStateAction<StudyState>>;
}

export function useStudyActions({ state, setState }: UseStudyActionsInput) {
  const t = useTranslations("Study");
  const activePassageIdRef = useRef(state.activePassageId);
  // Guards against re-entrant retries of the same artifact (e.g. a fast
  // double-click), which would otherwise re-create the same id twice.
  const retryingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activePassageIdRef.current = state.activePassageId;
  }, [state.activePassageId]);

  const updateCacheEntry = useCallback(
    (passageId: string, updater: (entry: ArtifactsCacheEntry) => ArtifactsCacheEntry) => {
      setState((prev) => ({
        ...prev,
        artifactsByPassageId: {
          ...prev.artifactsByPassageId,
          [passageId]: updater(prev.artifactsByPassageId[passageId] ?? { status: "idle", data: [] }),
        },
      }));
    },
    [setState],
  );

  const updateArtifactStatus = useCallback(
    (passageId: string, artifactId: string, patch: Partial<StudioArtifact>) => {
      updateCacheEntry(passageId, (entry) => ({
        ...entry,
        data: entry.data.map((r) => (r.id === artifactId ? { ...r, ...patch } : r)),
      }));
    },
    [updateCacheEntry],
  );

  const handleSimplify = useCallback(async () => {
    const passageId = activePassageIdRef.current;
    if (!passageId) return;

    setState((prev) => ({ ...prev, simplifying: true, error: null }));
    try {
      const result = await studySimplifyAction({ passageId });
      if ("error" in result) {
        setState((prev) => ({ ...prev, simplifying: false, error: result.error }));
        return;
      }
      if ("skipped" in result) {
        setState((prev) => ({ ...prev, simplifying: false }));
        return;
      }
      setState((prev) => ({
        ...prev,
        simplifying: false,
        passages: prev.passages.map((passage) =>
          passage.id === passageId
            ? {
                ...passage,
                simplifiedContent: result.simplifiedContent,
                simplifiedLevel: result.simplifiedLevel,
              }
            : passage,
        ),
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        simplifying: false,
        error: err instanceof Error ? err.message : t("simplificationFailed"),
      }));
    }
  }, [setState, t]);

  // Marks the artifact failed in client state (with the structured reason for the
  // localized card message) and deletes the DB row — failures are ephemeral, so a
  // reload shows a clean slate. The global error banner is only set when the
  // failed generation belongs to the passage the user is currently viewing.
  const failQuizArtifact = useCallback(
    async (passageId: string, artifactId: string, errorCode: StudioArtifactErrorCode, errorDetail?: string) => {
      if (activePassageIdRef.current === passageId) {
        setState((prev) => ({ ...prev, error: errorDetail ?? t("generationFailed") }));
      }
      updateArtifactStatus(passageId, artifactId, { status: "failed", errorCode, errorDetail });
      await studioDeleteArtifactAction({ artifactId });
    },
    [setState, t, updateArtifactStatus],
  );

  const generateQuizArtifact = useCallback(
    async (passageId: string, artifactId: string) => {
      try {
        const result = await generateStudioQuestions({ passageId, artifactId });
        if ("error" in result) {
          await failQuizArtifact(passageId, artifactId, result.code, result.error);
          return;
        }
        // Success: complete into the originating passage's cache regardless of
        // whether the user has since switched passages, so a valid quiz is never
        // discarded — it is waiting when they return to that passage.
        await studioCompleteArtifactAction({ artifactId });
        updateArtifactStatus(passageId, artifactId, {
          status: "done",
          errorCode: undefined,
          errorDetail: undefined,
          updatedAt: new Date().toISOString(),
        });
        setState((prev) => ({
          ...prev,
          artifactDetailById: {
            ...prev.artifactDetailById,
            [artifactId]: { questions: result.questions },
          },
        }));
      } catch (err) {
        await failQuizArtifact(passageId, artifactId, "UNKNOWN", err instanceof Error ? err.message : undefined);
      }
    },
    [failQuizArtifact, setState, updateArtifactStatus],
  );

  // Re-runs generation on a failed card. The row was deleted on failure, so we
  // re-create it under the same id (keeps the card stable) and regenerate.
  const retryQuizArtifact = useCallback(
    async (artifactId: string) => {
      const passageId = activePassageIdRef.current;
      if (!passageId) return;
      const passage = state.passages.find((item) => item.id === passageId);
      if (!passage) return;
      if (retryingIdsRef.current.has(artifactId)) return;
      retryingIdsRef.current.add(artifactId);

      updateArtifactStatus(passageId, artifactId, {
        status: "generating",
        errorCode: undefined,
        errorDetail: undefined,
      });

      try {
        const createResult = await studioCreateArtifactAction({ id: artifactId, passageId, type: "quiz", title: passage.title });
        if ("error" in createResult) {
          await failQuizArtifact(passageId, artifactId, "UNKNOWN", createResult.error);
          return;
        }
        await generateQuizArtifact(passageId, artifactId);
      } finally {
        retryingIdsRef.current.delete(artifactId);
      }
    },
    [state.passages, updateArtifactStatus, failQuizArtifact, generateQuizArtifact],
  );

  const handleActionClick = useCallback(
    async (actionId: StudioActionId) => {
      const passageId = activePassageIdRef.current;
      if (!passageId) return;
      const passage = state.passages.find((item) => item.id === passageId);
      if (!passage) return;

      if (actionId !== "quiz") return;

      const artifactId = crypto.randomUUID();

      // Persist artifact row immediately so it survives page refreshes
      const createResult = await studioCreateArtifactAction({ id: artifactId, passageId, type: "quiz", title: passage.title });
      if ("error" in createResult) {
        setState((prev) => ({ ...prev, error: createResult.error }));
        return;
      }

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
    [generateQuizArtifact, state.passages, updateCacheEntry, setState],
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

      const result = await studioLoadArtifactDetailAction({
        artifactId: ref.id,
        type: ref.type,
        passageId,
      });

      if (!("error" in result)) {
        setState((prev) => ({
          ...prev,
          artifactDetailById: {
            ...prev.artifactDetailById,
            [ref.id]: result,
          },
        }));
      }
    },
    [setState, state.artifactDetailById],
  );

  const handleRecordQuizResult = useCallback(
    (passageId: string, artifactId: string, stats: { correctCount: number; totalQuestions: number }) => {
      updateArtifactStatus(passageId, artifactId, {
        quizResult: {
          completedAt: new Date().toISOString(),
          correctCount: stats.correctCount,
          totalQuestions: stats.totalQuestions,
          accuracyRate: stats.totalQuestions > 0
            ? Math.round((stats.correctCount / stats.totalQuestions) * 100) / 100
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
    handleSimplify,
    handleActionClick,
    handleViewArtifact,
    handleRecordQuizResult,
    handleResetQuizResult,
    retryQuizArtifact,
  };
}
