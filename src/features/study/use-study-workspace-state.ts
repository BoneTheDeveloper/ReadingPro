"use client";

import { useCallback, useMemo, useState } from "react";
import { studyDeletePassageAction } from "@/features/study/actions/study-delete-passage-action";
import type { DocumentItem, PassageData, StudyState } from "./study-types";

function getMostRecentPassageId(passages: PassageData[]): string | null {
  return passages.reduce<PassageData | null>((latest, passage) => {
    if (!latest) return passage;
    // Strict > preserves first-seen order on ties
    return passage.createdAt > latest.createdAt ? passage : latest;
  }, null)?.id ?? null;
}

export function useStudyWorkspaceState(initialPassages: PassageData[]) {
  const [state, setState] = useState<StudyState>(() => {
    const initialId = getMostRecentPassageId(initialPassages);
    return {
      passages: initialPassages,
      activePassageId: initialId,
      questions: [],
      status: initialId ? "ready" : "idle",
      error: null,
      simplifying: false,
      generatingQuestions: false,
      uploadModalOpen: false,
      viewingArtifactId: null,
    };
  });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState("");

  const activePassage = useMemo(
    () => state.passages.find((passage) => passage.id === state.activePassageId) ?? null,
    [state.passages, state.activePassageId],
  );

  const documents: DocumentItem[] = useMemo(
    () =>
      [...state.passages]
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .map((passage) => ({
          id: passage.id,
          title: passage.title,
          date: new Date(passage.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          level: passage.originalLevel,
          wordCount: passage.wordCount,
          sourceType: passage.sourceType,
        })),
    [state.passages],
  );

  const handleSelectDocument = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      activePassageId: id,
      questions: [],
      viewingArtifactId: null,
      status: "ready",
    }));
  }, []);

  const handleOpenUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: true }));
  }, []);

  const handleCloseUploadModal = useCallback(() => {
    setState((prev) => ({ ...prev, uploadModalOpen: false }));
  }, []);

  const handleUploadStart = useCallback((fileName: string) => {
    setIsUploading(true);
    setUploadingFileName(fileName);
  }, []);

  const handleUploadComplete = useCallback((passage: PassageData) => {
    setState((prev) => ({
      ...prev,
      passages: [...prev.passages, passage],
      activePassageId: passage.id,
      uploadModalOpen: false,
      status: "ready",
      questions: [],
      viewingArtifactId: null,
      error: null,
    }));
    setIsUploading(false);
    setUploadingFileName("");
  }, []);

  const handleUploadError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
    setIsUploading(false);
    setUploadingFileName("");
  }, []);

  const handleDeletePassage = useCallback(async (passageId: string) => {
    try {
      const result = await studyDeletePassageAction({ passageId });
      if ("error" in result) {
        setState((prev) => ({ ...prev, error: result.error }));
        return;
      }
      setState((prev) => {
        const remaining = prev.passages.filter((p) => p.id !== passageId);
        if (prev.activePassageId === passageId) {
          const replacementId = getMostRecentPassageId(remaining);
          return {
            ...prev,
            passages: remaining,
            activePassageId: replacementId,
            questions: [],
            viewingArtifactId: null,
            status: replacementId ? "ready" : "idle",
            error: null,
          };
        }
        return { ...prev, passages: remaining, error: null };
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : "Failed to delete passage",
      }));
    }
  }, []);

  return {
    state,
    setState,
    activePassage,
    documents,
    isUploading,
    uploadingFileName,
    handleSelectDocument,
    handleOpenUploadModal,
    handleCloseUploadModal,
    handleUploadStart,
    handleUploadComplete,
    handleUploadError,
    handleDeletePassage,
  };
}
