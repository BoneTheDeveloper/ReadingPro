"use client";

import { useCallback, useMemo, useState } from "react";
import { studyDeletePassageAction } from "@/features/study/actions/study-delete-passage-action";
import type { DocumentItem, PassageData, StudyState } from "./study-types";

export function useStudyWorkspaceState(initialPassages: PassageData[]) {
  const [state, setState] = useState<StudyState>(() => ({
    passages: initialPassages,
    activePassageId: null,
    questions: [],
    status: "idle",
    error: null,
    simplifying: false,
    generatingQuestions: false,
    uploadModalOpen: false,
  }));
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
    const result = await studyDeletePassageAction({ passageId });
    if ("error" in result) {
      setState((prev) => ({ ...prev, error: result.error }));
      return;
    }
    setState((prev) => ({
      ...prev,
      passages: prev.passages.filter((passage) => passage.id !== passageId),
      activePassageId: prev.activePassageId === passageId ? null : prev.activePassageId,
      questions: prev.activePassageId === passageId ? [] : prev.questions,
      status: prev.activePassageId === passageId ? "idle" : prev.status,
    }));
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
