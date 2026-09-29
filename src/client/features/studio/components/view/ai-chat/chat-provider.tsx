"use client";

import { useState, useCallback, useMemo } from "react";
import { Chat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { StudyChatLanguage } from "@/shared/studio/chat";
import { ChatContext, registerChat } from "./chat-context";

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
  initialMessages = [],
  children,
}: {
  passageId: string;
  initialMessages?: UIMessage[];
  children: React.ReactNode;
}) {
  const [language, setLanguage] = useState<StudyChatLanguage>("vi");

  // useState ensures Chat instance persists across re-renders
  // but NOT across unmount (which we want for passage change)
  const [chat] = useState(() => {
    const newChat = new Chat({
      id: passageId,
      messages: initialMessages,
      transport: new DefaultChatTransport({ api: "/api/ai-chat" }),
    });
    registerChat(newChat);
    return newChat;
  });

  const clearChatMessages = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability -- Chat.messages is a setter on the Chat class, not a mutable ref
    chat.messages = [];
  }, [chat]);

  const value = useMemo(
    () => ({ chat, language, setLanguage, clearChatMessages }),
    [chat, language, clearChatMessages],
  );

  return (
    <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
  );
}
