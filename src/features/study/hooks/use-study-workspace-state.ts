"use client";

import { useCallback, useMemo, useState } from "react";
import { deletePassage } from "@/features/study/api/passages-client";
import type { DocumentItem, PassageData, StudyState } from "../model/types";

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
      status: initialId ? "ready" : "idle",
      error: null,
      simplifying: false,
      uploadModalOpen: false,
      artifactsByPassageId: {},
      viewingArtifactByPassageId: {},
      artifactDetailById: {},
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
      await deletePassage(passageId);
      setState((prev) => {
        const remaining = prev.passages.filter((p) => p.id !== passageId);
        const restArtifactsByPassageId = { ...prev.artifactsByPassageId };
        const restViewingByPassageId = { ...prev.viewingArtifactByPassageId };
        delete restArtifactsByPassageId[passageId];
        delete restViewingByPassageId[passageId];
        if (prev.activePassageId === passageId) {
          const replacementId = getMostRecentPassageId(remaining);
          return {
            ...prev,
            passages: remaining,
            activePassageId: replacementId,
            artifactsByPassageId: restArtifactsByPassageId,
            viewingArtifactByPassageId: restViewingByPassageId,
            status: replacementId ? "ready" : "idle",
            error: null,
          };
        }
        return { ...prev, passages: remaining, artifactsByPassageId: restArtifactsByPassageId, viewingArtifactByPassageId: restViewingByPassageId, error: null };
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
