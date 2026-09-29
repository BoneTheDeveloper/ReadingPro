"use client";

import { useCallback, useState } from "react";

export interface WorkspaceError {
  id: string;
  title: string;
  message: string;
}

export function useUploadFlow() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [errors, setErrors] = useState<WorkspaceError[]>([]);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    setErrors((prev) => prev.filter((e) => e.id !== "upload"));
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const addError = useCallback(
    (id: string, title: string, message: string) => {
      setErrors((prev) => {
        // Replace any existing record with the same id (latest message wins)
        // so the panel doesn't stack duplicates for the same failure.
        const filtered = prev.filter((e) => e.id !== id);
        return [...filtered, { id, title, message }];
      });
    },
    [],
  );

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return {
    isModalOpen,
    errors,
    openModal,
    closeModal,
    addError,
    dismissError,
  };
}
