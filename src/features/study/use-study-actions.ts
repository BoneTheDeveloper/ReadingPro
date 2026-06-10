"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Dispatch, SetStateAction } from "react";
import { studyGenerateQuestionsAction } from "@/features/study/actions/study-generate-questions-action";
import { studySimplifyAction } from "@/features/study/actions/study-simplify-action";
import type { ArtifactItem, ArtifactType, StudioCardId, StudyState } from "./study-types";

interface UseStudyActionsInput {
  state: StudyState;
  setState: Dispatch<SetStateAction<StudyState>>;
}

export function useStudyActions({ state, setState }: UseStudyActionsInput) {
  const t = useTranslations("Study");
  const [artifacts, setArtifacts] = useState<ArtifactItem[]>([]);
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
        error: err instanceof Error ? err.message : t("simplificationFailed"),
      }));
    }
  }, [setState, t]);

  const markArtifactError = useCallback((artifactId: string) => {
    setArtifacts((prev) => prev.map((a) => (a.id === artifactId ? { ...a, status: "error" } : a)));
  }, []);

  const generateQuizArtifact = useCallback(
    async (passageId: string, artifactId: string) => {
      try {
        const result = await studyGenerateQuestionsAction({ passageId });
        if (activePassageIdRef.current !== passageId) {
          markArtifactError(artifactId);
          return;
        }
        if ("error" in result) {
          setState((prev) => ({ ...prev, error: result.error }));
          markArtifactError(artifactId);
          return;
        }
        setState((prev) => ({ ...prev, questions: result.questions }));
        setArtifacts((prev) =>
          prev.map((item) =>
            item.id === artifactId
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
          error: err instanceof Error ? err.message : t("generationFailed"),
        }));
        markArtifactError(artifactId);
      }
    },
    [markArtifactError, setState, t],
  );

  const generateSummaryArtifact = useCallback(
    async (
      passageId: string,
      artifactId: string,
      existingSimplifiedContent: string | null,
      existingSimplifiedLevel: string | null,
    ) => {
      setState((prev) => ({ ...prev, simplifying: true, error: null }));
      try {
        const result = await studySimplifyAction({ passageId });
        if (activePassageIdRef.current !== passageId) {
          markArtifactError(artifactId);
          setState((prev) => ({ ...prev, simplifying: false }));
          return;
        }
        if ("error" in result) {
          setState((prev) => ({ ...prev, simplifying: false, error: result.error }));
          markArtifactError(artifactId);
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
        setArtifacts((prev) =>
          prev.map((item) =>
            item.id === artifactId
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
          error: err instanceof Error ? err.message : t("simplificationFailed"),
        }));
        markArtifactError(artifactId);
      }
    },
    [markArtifactError, setState, t],
  );

  const handleActionClick = useCallback(
    async (cardId: StudioCardId) => {
      const passageId = activePassageIdRef.current;
      if (!passageId) return;
      const passage = state.passages.find((item) => item.id === passageId);
      if (!passage) return;

      const artifactId = crypto.randomUUID();
      const artifactType: ArtifactType = cardId === "quiz" ? "quiz" : "summary";

      setArtifacts((prev) => [
        {
          id: artifactId,
          type: artifactType,
          passageId,
          passageTitle: passage.title,
          status: "running",
          startedAt: Date.now(),
        },
        ...prev,
      ]);

      if (cardId === "quiz") {
        await generateQuizArtifact(passageId, artifactId);
      } else if (cardId === "summary") {
        await generateSummaryArtifact(passageId, artifactId, passage.simplifiedContent, passage.simplifiedLevel);
      }
    },
    [generateQuizArtifact, generateSummaryArtifact, state.passages],
  );

  return {
    artifacts,
    handleSimplify,
    handleActionClick,
  };
}
