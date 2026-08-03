"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { AlertCircle, RotateCw, Trash2 } from "lucide-react";
import { StudioDetailView } from "../studio-detail-view";
import { ChatMessageList } from "./chat-message-list";
import { ChatComposer } from "./chat-composer";

interface ChatDetailViewProps {
  passageId: string;
  onClose: () => void;
}

export function ChatDetailView({ passageId, onClose }: ChatDetailViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai-chat",
        body: { passageId },
      }),
    [passageId],
  );

  const { messages, sendMessage, status, error, stop, regenerate, setMessages, clearError } =
    useChat({ transport });
  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ text });
  };

  const handleReset = async () => {
    if (isStreaming) return;
    const confirmed = window.confirm(
      "Xoá hội thoại này? Lịch sử trò chuyện của bài đọc sẽ bị xoá.",
    );
    if (!confirmed) return;

    const res = await fetch(`/api/ai-chat?passageId=${encodeURIComponent(passageId)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;

    setMessages([]);
    clearError();
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
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto panel-scroll bg-paper"
        >
          <ChatMessageList
            messages={messages}
            isStreaming={isStreaming}
            onPickSuggestion={(text) => sendMessage({ text })}
          />
        </div>

        {status === "error" && error && (
          <div className="shrink-0 px-4 py-2 border-t border-border bg-danger-soft flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <p className="text-xs text-danger flex-1">Đã có lỗi xảy ra. Vui lòng thử lại.</p>
            <button
              type="button"
              onClick={() => regenerate()}
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
        />
      </div>
    </StudioDetailView>
  );
}
