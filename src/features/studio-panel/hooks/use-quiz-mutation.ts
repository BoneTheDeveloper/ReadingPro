"use client";

import { useCallback, useEffect, useRef } from "react";
import { generateStudioQuestions } from "@/features/studio-panel/hooks/use-studio-questions";
import type {
  StudioArtifact,
  StudioArtifactErrorCode,
} from "@/features/studio-panel/schemas/studio-artifact";
import type { StudioActionId } from "@/features/studio-panel/server/actions/artifact";
import type { PassageData } from "@/types/passage";

type SetArtifactsCallback = (updater: (prev: StudioArtifact[]) => StudioArtifact[]) => void;

interface UseQuizMutationOptions {
  passageId: string | null | undefined;
  passages: PassageData[] | undefined;
  setArtifacts: SetArtifactsCallback;
  setError: (error: string | null) => void;
}

export function useQuizMutation({
  passageId, passages, setArtifacts, setError,
}: UseQuizMutationOptions) {
  const passageIdRef = useRef(passageId ?? null);
  const passagesRef = useRef(passages);

  useEffect(() => { passageIdRef.current = passageId ?? null; }, [passageId]);
  useEffect(() => { passagesRef.current = passages; }, [passages]);

  const updateArtifact = useCallback(
    (artifactId: string, patch: Partial<StudioArtifact>) => {
      setArtifacts((prev) => prev.map((r) => (r.id === artifactId ? { ...r, ...patch } : r)));
    },
    [setArtifacts],
  );

  const failArtifact = useCallback(
    (artifactId: string, errorCode: StudioArtifactErrorCode, errorDetail?: string) => {
      updateArtifact(artifactId, { status: "failed", errorCode, errorDetail });
      setError(errorDetail ?? "Tạo nội dung thất bại");
    },
    [updateArtifact, setError],
  );

  const generateQuizArtifact = useCallback(
    async (artifactId: string) => {
      const pid = passageIdRef.current;
      if (!pid) return;
      try {
        const result = await generateStudioQuestions({ passageId: pid, artifactId });
        if ("error" in result) {
          failArtifact(artifactId, result.code, result.error);
          return;
        }
        updateArtifact(artifactId, { ...result.artifact, errorCode: undefined, errorDetail: undefined });
      } catch (err) {
        failArtifact(artifactId, "UNKNOWN", err instanceof Error ? err.message : undefined);
      }
    },
    [failArtifact, updateArtifact],
  );

  const handleActionClick = useCallback(
    async (actionId: StudioActionId) => {
      const pid = passageIdRef.current;
      if (!pid) return;
      const passage = passagesRef.current?.find((p) => p.id === pid);
      if (!passage) return;
      if (actionId !== "quiz") return;
      const artifactId = crypto.randomUUID();
      const optimistic: StudioArtifact = { id: artifactId, type: "quiz", passageId: pid, title: passage.title, status: "generating", createdAt: new Date().toISOString() };
      setArtifacts((prev) => [optimistic, ...prev]);
      await generateQuizArtifact(artifactId);
    },
    [setArtifacts, generateQuizArtifact],
  );

  const handleRecordQuizResult = useCallback(
    (artifactId: string, stats: { correctCount: number; totalQuestions: number }) => {
      updateArtifact(artifactId, {
        quizResult: { completedAt: new Date().toISOString(), correctCount: stats.correctCount, totalQuestions: stats.totalQuestions, accuracyRate: stats.totalQuestions > 0 ? Math.round((stats.correctCount / stats.totalQuestions) * 100) / 100 : 0 },
      });
    },
    [updateArtifact],
  );

  const handleResetQuizResult = useCallback(
    (artifactId: string) => { updateArtifact(artifactId, { quizResult: undefined }); },
    [updateArtifact],
  );

  return { handleActionClick, handleRecordQuizResult, handleResetQuizResult };
}
