"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { AlertCircle, Loader2, RotateCw, Trash2 } from "lucide-react";
import { StudioDetailView } from "../studio-detail-view";
import { ChatMessageList } from "./chat-message-list";
import { ChatComposer } from "./chat-composer";
import { useQuery } from "@tanstack/react-query";
import { chatQueries } from "@/features/studio/api/queries";
import { useResetChatMutation } from "@/features/studio/api/mutations";
import { useChatContext } from "./chat-context";

interface ChatDetailViewProps {
  passageId: string;
  onClose: () => void;
}

export function ChatDetailView({ passageId, onClose }: ChatDetailViewProps) {
  const historyQuery = useQuery(chatQueries.history(passageId));

  if (historyQuery.isPending) {
    return (
      <StudioDetailView title="Trò chuyện" onClose={onClose}>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </StudioDetailView>
    );
  }

  if (historyQuery.isError) {
    return (
      <StudioDetailView title="Trò chuyện" onClose={onClose}>
        <div className="flex h-full items-center justify-center text-sm text-destructive">
          {historyQuery.error.message}
        </div>
      </StudioDetailView>
    );
  }

  // Note: ChatConversation receives the seeded Chat instance from context.
  // Messages are pre-loaded into the Chat instance during ChatProvider creation.
  return (
    <ChatConversation
      passageId={passageId}
      onClose={onClose}
    />
  );
}

function ChatConversation({ passageId, onClose }: ChatDetailViewProps) {
  const [input, setInput] = useState("");
  const { chat, language, setLanguage, clearChatMessages } = useChatContext();
  const resetChat = useResetChatMutation();

  // Use the Chat instance from context - this reuses the same instance
  // across panel close/open for the same passage.
  // Messages are seeded in the Chat instance during ChatProvider creation.
  const { messages, sendMessage, status, error, stop, regenerate } = useChat({ chat });

  const isStreaming = status === "submitted" || status === "streaming";

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    // Pass dynamic values per request — hook-level body is captured at
    // mount and can go stale after subsequent sends.
    sendMessage({ text }, { body: { passageId, language } });
  };

  const handleReset = () => {
    if (isStreaming) return;

    // The mutation evicts the cached history; clearing chat's messages
    // makes the open conversation re-render empty.
    resetChat.mutate(passageId, {
      onSuccess: () => clearChatMessages(),
    });
  };

  const resetButton = (
    <button
      type="button"
      onClick={handleReset}
      disabled={isStreaming || messages.length === 0}
      aria-label="Xoá hội thoại"
      title="Xoá hội thoại"
      className="flex items-center justify-center w-7 h-7 rounded-lg border border-transparent text-ink-3 transition-colors hover:bg-surface hover:border-border hover:text-danger disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Trash2 className="w-[15px] h-[15px]" />
    </button>
  );

  return (
    <StudioDetailView title="Trò chuyện" onClose={onClose} action={resetButton}>
      <div className="flex flex-col h-full">
        <div className="flex-1 min-h-0 overflow-y-auto panel-scroll bg-paper">
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            onPickSuggestion={(text) =>
              sendMessage({ text }, { body: { passageId, language } })
            }
          />
        </div>

        {status === "error" && error && (
          <div className="shrink-0 px-4 py-2 border-t border-border bg-danger-soft flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <p className="text-xs text-danger flex-1">Đã có lỗi xảy ra. Vui lòng thử lại.</p>
            <button
              type="button"
              onClick={() => regenerate({ body: { passageId, language } })}
              className="flex items-center gap-1 h-7 px-2 rounded-md text-xs font-medium text-danger transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCw className="w-3 h-3" />
              Thử lại
            </button>
          </div>
        )}

        <ChatComposer
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          onStop={stop}
          isStreaming={isStreaming}
          language={language}
          onLanguageChange={setLanguage}
        />
      </div>
    </StudioDetailView>
  );
}
