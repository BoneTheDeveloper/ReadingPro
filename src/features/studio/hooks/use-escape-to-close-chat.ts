"use client";

import { useEffect } from "react";

/**
 * Closes the chat view when Escape is pressed and the chat is active.
 * Also clears any local chat prefill state via the provided callback.
 */
export function useEscapeToCloseChat(
  isActive: boolean,
  onClose: () => void,
  onClearLocal: () => void,
) {
  useEffect(() => {
    if (!isActive) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        onClearLocal();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isActive, onClose, onClearLocal]);
}
