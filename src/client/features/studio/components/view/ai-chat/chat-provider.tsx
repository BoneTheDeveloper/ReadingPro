"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Chat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import type { StudyChatLanguage } from "@/shared/studio/chat";
import { chatQueries } from "../../../api/queries";
import { ChatContext, registerChat } from "./chat-context";

/** The persisted shape of a conversation: the server stores text parts only. */
function toHistory(messages: UIMessage[]) {
  return messages.flatMap((message) => {
    if (message.role === "system") return [];
    const parts = message.parts.flatMap((part) =>
      part.type === "text" ? [{ type: "text" as const, text: part.text }] : [],
    );
    return parts.length > 0 ? [{ id: message.id, role: message.role, parts }] : [];
  });
}

/**
 * ChatProvider holds a Chat instance per passageId.
 *
 * Using `key={passageId}` on this provider forces a remount when passageId
 * changes, creating a fresh Chat instance for the new passage.
 *
 * The Chat instance persists across panel close/open for the same passageId.
 */
export function ChatProvider({
  passageId,
  children,
}: {
  passageId: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [language, setLanguage] = useState<StudyChatLanguage>("vi");

  // Created on the first open, seeded with the persisted history. Later opens
  // reuse it, so a reply that is still streaming survives closing the panel.
  const chatRef = useRef<Chat<UIMessage> | null>(null);

  const getChat = useCallback(
    (initialMessages: UIMessage[]) => {
      if (!chatRef.current) {
        chatRef.current = new Chat({
          id: passageId,
          messages: initialMessages,
          transport: new DefaultChatTransport({ api: "/api/ai-chat" }),
          // Keeps the cached history in step with the conversation, so coming
          // back to this passage later seeds the latest turns, not a stale copy.
          onFinish: ({ messages }) => {
            queryClient.setQueryData(chatQueries.history(passageId).queryKey, toHistory(messages));
          },
        });
        registerChat(chatRef.current);
      }
      return chatRef.current;
    },
    [passageId, queryClient],
  );

  const clearChatMessages = useCallback(() => {
    if (chatRef.current) chatRef.current.messages = [];
  }, []);

  const value = useMemo(
    () => ({ getChat, language, setLanguage, clearChatMessages }),
    [getChat, language, clearChatMessages],
  );

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}
