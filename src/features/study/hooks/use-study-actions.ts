"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Dispatch, SetStateAction } from "react";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import { generateStudyQuestions } from "@/features/study/api/study-questions-client";
import {
  studyCreateArtifactAction,
  studyCompleteArtifactAction,
  studyFailArtifactAction,
  studyLoadArtifactDetailAction,
} from "@/features/study/actions/study-artifact-actions";
import type {
  ArtifactsCacheEntry,
  ArtifactRef,
  StudioActionId,
  StudioArtifact,
  StudyState,
} from "../model/types";

interface UseStudyActionsInput {
  state: StudyState;
  setState: Dispatch<SetStateAction<StudyState>>;
}

export function useStudyActions({ state, setState }: UseStudyActionsInput) {
  const t = useTranslations("Study");
  const activePassageIdRef = useRef(state.activePassageId);

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

  const generateQuizArtifact = useCallback(
    async (passageId: string, artifactId: string) => {
      try {
        const result = await generateStudyQuestions({ passageId, artifactId });
        if (activePassageIdRef.current !== passageId) {
          updateArtifactStatus(passageId, artifactId, { status: "failed" });
          await studyFailArtifactAction({ artifactId });
          return;
        }
        if ("error" in result) {
          setState((prev) => ({ ...prev, error: result.error }));
          updateArtifactStatus(passageId, artifactId, { status: "failed" });
          await studyFailArtifactAction({ artifactId });
          return;
        }
        await studyCompleteArtifactAction({ artifactId });
        updateArtifactStatus(passageId, artifactId, { status: "done", updatedAt: new Date().toISOString() });
        setState((prev) => ({
          ...prev,
          artifactDetailById: {
            ...prev.artifactDetailById,
            [artifactId]: { questions: result.questions },
          },
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : t("generationFailed"),
        }));
        updateArtifactStatus(passageId, artifactId, { status: "failed" });
        await studyFailArtifactAction({ artifactId });
      }
    },
    [setState, t, updateArtifactStatus],
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
      const createResult = await studyCreateArtifactAction({ id: artifactId, passageId, type: "quiz", title: passage.title });
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

      const result = await studyLoadArtifactDetailAction({
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

  return {
    handleSimplify,
    handleActionClick,
    handleViewArtifact,
  };
}
