"use client";

import { useState, useEffect, useDeferredValue } from "react";

/**
 * Resolves the chat prefill value to use for the chat view.
 *
 * - `chatPrefillFromParent` is the source of truth from the parent (e.g. vocabulary click).
 * - `localChatPrefill` is the value the panel is currently displaying inside the chat.
 * - When the chat view is active, the panel surfaces `deferredParent ?? local`,
 *   and pushes that value back up via `onChatPrefillChange` so the parent can
 *   clear it once it's been consumed.
 * - When the chat view is not active, the prefill is null.
 */
export function useChatPrefill(
  chatPrefillFromParent: string | null | undefined,
  onChatPrefillChange: ((prefill: string | null) => void) | undefined,
  isChatActive: boolean,
) {
  const [localChatPrefill, setLocalChatPrefill] = useState<string | null>(null);
  const chatPrefillDeferred = useDeferredValue(chatPrefillFromParent ?? null);

  const chatPrefill = isChatActive ? (chatPrefillDeferred ?? localChatPrefill) : null;

  useEffect(() => {
    onChatPrefillChange?.(chatPrefill);
  }, [chatPrefill, onChatPrefillChange]);

  return { chatPrefill, setLocalChatPrefill };
}
