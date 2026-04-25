"use client";

import { useState, useDeferredValue } from "react";

export function useChatSession(isChatActive: boolean) {
  const [localChatPrefill, setLocalChatPrefill] = useState<string | null>(null);
  const chatPrefillDeferred = useDeferredValue(localChatPrefill);

  const chatPrefill = isChatActive ? chatPrefillDeferred : null;

  return { chatPrefill, setLocalChatPrefill };
}
