"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Chat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { StudyChatLanguage } from "@/features/studio/schema/ai-chat";

interface ChatContextValue {
  chat: Chat<UIMessage>;
  language: StudyChatLanguage;
  setLanguage: (language: StudyChatLanguage) => void;
  clearChatMessages: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

// Global registry for logout cleanup
const chatRegistry = new Set<Chat<UIMessage>>();

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
    chatRegistry.add(newChat);
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

/**
 * Clear all Chat instances from the registry.
 * Call this on logout to prevent memory leaks.
 */
export function clearAllChats(): void {
  chatRegistry.forEach((chat) => {
    chat.messages = [];
  });
  chatRegistry.clear();
}

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error(
      "useChatContext must be used within a ChatProvider. " +
        "Wrap your component tree with <ChatProvider passageId={...}>",
    );
  }
  return ctx;
}
