"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Dispatch, SetStateAction } from "react";
import { studyGenerateQuestionsAction } from "@/features/study/actions/study-generate-questions-action";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import type {
  DetailCacheEntry,
  ResultsCacheEntry,
  StudioCardId,
  StudioResult,
  StudyState,
} from "./study-types";

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
    (passageId: string, updater: (entry: ResultsCacheEntry) => ResultsCacheEntry) => {
      setState((prev) => ({
        ...prev,
        resultsByPassageId: {
          ...prev.resultsByPassageId,
          [passageId]: updater(prev.resultsByPassageId[passageId] ?? { status: "idle", data: [] }),
        },
      }));
    },
    [setState],
  );

  const updateResultStatus = useCallback(
    (passageId: string, resultId: string, patch: Partial<StudioResult>) => {
      updateCacheEntry(passageId, (entry) => ({
        ...entry,
        data: entry.data.map((r) => (r.id === resultId ? { ...r, ...patch } : r)),
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
    async (passageId: string, resultId: string) => {
      try {
        const result = await studyGenerateQuestionsAction({ passageId });
        if (activePassageIdRef.current !== passageId) {
          updateResultStatus(passageId, resultId, { status: "error" });
          return;
        }
        if ("error" in result) {
          setState((prev) => ({ ...prev, error: result.error }));
          updateResultStatus(passageId, resultId, { status: "error" });
          return;
        }
        updateResultStatus(passageId, resultId, { status: "completed", updatedAt: new Date().toISOString() });
        setState((prev) => ({
          ...prev,
          resultDetailById: {
            ...prev.resultDetailById,
            [resultId]: { questions: result.questions },
          },
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : t("generationFailed"),
        }));
        updateResultStatus(passageId, resultId, { status: "error" });
      }
    },
    [setState, t, updateResultStatus],
  );

  const generateSummaryArtifact = useCallback(
    async (
      passageId: string,
      resultId: string,
      existingSimplifiedContent: string | null,
      existingSimplifiedLevel: string | null,
    ) => {
      setState((prev) => ({ ...prev, simplifying: true, error: null }));
      try {
        const result = await studySimplifyAction({ passageId });
        if (activePassageIdRef.current !== passageId) {
          updateResultStatus(passageId, resultId, { status: "error" });
          setState((prev) => ({ ...prev, simplifying: false }));
          return;
        }
        if ("error" in result) {
          setState((prev) => ({ ...prev, simplifying: false, error: result.error }));
          updateResultStatus(passageId, resultId, { status: "error" });
          return;
        }

        const detail: DetailCacheEntry =
          "skipped" in result
            ? {
                simplifiedContent: existingSimplifiedContent,
                simplifiedLevel: existingSimplifiedLevel,
              }
            : {
                simplifiedContent: result.simplifiedContent,
                simplifiedLevel: result.simplifiedLevel,
              };

        updateResultStatus(passageId, resultId, { status: "completed", updatedAt: new Date().toISOString() });
        setState((prev) => ({
          ...prev,
          simplifying: false,
          passages: prev.passages.map((passage) =>
            passage.id === passageId && !("skipped" in result)
              ? {
                  ...passage,
                  simplifiedContent: result.simplifiedContent,
                  simplifiedLevel: result.simplifiedLevel,
                }
              : passage,
          ),
          resultDetailById: {
            ...prev.resultDetailById,
            [resultId]: detail,
          },
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          simplifying: false,
          error: err instanceof Error ? err.message : t("simplificationFailed"),
        }));
        updateResultStatus(passageId, resultId, { status: "error" });
      }
    },
    [setState, t, updateResultStatus],
  );

  const handleActionClick = useCallback(
    async (cardId: StudioCardId) => {
      const passageId = activePassageIdRef.current;
      if (!passageId) return;
      const passage = state.passages.find((item) => item.id === passageId);
      if (!passage) return;

      const resultId = crypto.randomUUID();
      const type: StudioResult["type"] = cardId === "quiz" ? "quiz" : "summary";

      const optimistic: StudioResult = {
        id: resultId,
        type,
        passageId,
        title: passage.title,
        status: "running",
        createdAt: new Date().toISOString(),
      };

      updateCacheEntry(passageId, (entry) => ({
        ...entry,
        data: [optimistic, ...entry.data],
      }));

      if (cardId === "quiz") {
        await generateQuizArtifact(passageId, resultId);
      } else if (cardId === "summary") {
        await generateSummaryArtifact(
          passageId,
          resultId,
          passage.simplifiedContent,
          passage.simplifiedLevel,
        );
      }
    },
    [generateQuizArtifact, generateSummaryArtifact, state.passages, updateCacheEntry],
  );

  return {
    handleSimplify,
    handleActionClick,
  };
}
