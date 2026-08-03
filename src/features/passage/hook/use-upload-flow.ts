"use client";

import { useCallback, useState } from "react";

export function useUploadFlow() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    setClientError(null);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setClientError(null);
  }, []);

  return {
    isModalOpen,
    clientError,
    openModal,
    closeModal,
    setClientError,
    clearClientError: useCallback(() => setClientError(null), []),
  };
}
