"use client";

import { useCallback, useState } from "react";
import type { Passage } from "@/features/passage/schema";

export function useUploadFlow(onComplete: (passage: Passage) => void) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isUploading = uploadingFileName !== null;

  const openModal = useCallback(() => {
    if (isUploading) return;
    setIsModalOpen(true);
    setError(null);
  }, [isUploading]);

  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const start = useCallback((fileName: string) => {
    setUploadingFileName(fileName);
    setError(null);
  }, []);

  const complete = useCallback(
    (passage: Passage) => {
      setUploadingFileName(null);
      setIsModalOpen(false);
      onComplete(passage);
    },
    [onComplete],
  );

  const fail = useCallback((message: string) => {
    setError(message);
    setUploadingFileName(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    isModalOpen,
    uploadingFileName,
    isUploading,
    error,
    openModal,
    closeModal,
    start,
    complete,
    fail,
    clearError,
  };
}
