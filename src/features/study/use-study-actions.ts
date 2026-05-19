"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { studyGenerateQuestionsAction } from "@/features/study/actions/study-generate-questions-action";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import type { ResultItem, ResultItemType, StudioCardId, StudyState } from "./study-types";

interface UseStudyActionsInput {
  state: StudyState;
  setState: Dispatch<SetStateAction<StudyState>>;
}

export function useStudyActions({ state, setState }: UseStudyActionsInput) {
  const [results, setResults] = useState<ResultItem[]>([]);
  const activePassageIdRef = useRef(state.activePassageId);

  useEffect(() => {
    activePassageIdRef.current = state.activePassageId;
  }, [state.activePassageId]);

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
        error: err instanceof Error ? err.message : "Simplification failed",
      }));
    }
  }, [setState]);

  const markResultError = useCallback((resultId: string) => {
    setResults((prev) => prev.map((result) => (result.id === resultId ? { ...result, status: "error" } : result)));
  }, []);

  const generateQuizResult = useCallback(
    async (passageId: string, resultId: string) => {
      try {
        const result = await studyGenerateQuestionsAction({ passageId });
        if (activePassageIdRef.current !== passageId) {
          markResultError(resultId);
          return;
        }
        if ("error" in result) {
          setState((prev) => ({ ...prev, error: result.error }));
          markResultError(resultId);
          return;
        }
        setState((prev) => ({ ...prev, questions: result.questions }));
        setResults((prev) =>
          prev.map((item) =>
            item.id === resultId
              ? {
                  ...item,
                  status: "completed",
                  completedAt: Date.now(),
                  data: { questions: result.questions },
                }
              : item,
          ),
        );
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : "Generation failed",
        }));
        markResultError(resultId);
      }
    },
    [markResultError, setState],
  );

  const generateSummaryResult = useCallback(
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
          markResultError(resultId);
          setState((prev) => ({ ...prev, simplifying: false }));
          return;
        }
        if ("error" in result) {
          setState((prev) => ({ ...prev, simplifying: false, error: result.error }));
          markResultError(resultId);
          return;
        }

        const data =
          "skipped" in result
            ? {
                simplifiedContent: existingSimplifiedContent,
                simplifiedLevel: existingSimplifiedLevel,
              }
            : {
                simplifiedContent: result.simplifiedContent,
                simplifiedLevel: result.simplifiedLevel,
              };

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
        }));
        setResults((prev) =>
          prev.map((item) =>
            item.id === resultId
              ? {
                  ...item,
                  status: "completed",
                  completedAt: Date.now(),
                  data,
                }
              : item,
          ),
        );
      } catch (err) {
        setState((prev) => ({
          ...prev,
          simplifying: false,
          error: err instanceof Error ? err.message : "Simplification failed",
        }));
        markResultError(resultId);
      }
    },
    [markResultError, setState],
  );

  const handleActionClick = useCallback(
    async (cardId: StudioCardId) => {
      const passageId = activePassageIdRef.current;
      if (!passageId) return;
      const passage = state.passages.find((item) => item.id === passageId);
      if (!passage) return;

      const resultId = crypto.randomUUID();
      const resultType: ResultItemType = cardId === "quiz" ? "quiz" : "summary";

      setResults((prev) => [
        {
          id: resultId,
          type: resultType,
          passageId,
          passageTitle: passage.title,
          status: "running",
          startedAt: Date.now(),
        },
        ...prev,
      ]);

      if (cardId === "quiz") {
        await generateQuizResult(passageId, resultId);
      } else if (cardId === "summary") {
        await generateSummaryResult(passageId, resultId, passage.simplifiedContent, passage.simplifiedLevel);
      }
    },
    [generateQuizResult, generateSummaryResult, state.passages],
  );

  return {
    results,
    handleSimplify,
    handleActionClick,
  };
}
