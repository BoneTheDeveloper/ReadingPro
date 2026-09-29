import { createContext, useContext } from "react";
import type { Chat, UIMessage } from "@ai-sdk/react";
import type { StudyChatLanguage } from "@/shared/studio/chat";

export interface ChatContextValue {
  chat: Chat<UIMessage>;
  language: StudyChatLanguage;
  setLanguage: (language: StudyChatLanguage) => void;
  clearChatMessages: () => void;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

// Global registry for logout cleanup
const chatRegistry = new Set<Chat<UIMessage>>();

export function registerChat(chat: Chat<UIMessage>): void {
  chatRegistry.add(chat);
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
