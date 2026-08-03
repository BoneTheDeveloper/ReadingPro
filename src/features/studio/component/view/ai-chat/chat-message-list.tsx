"use client";

import { MessageCircle, Loader2 } from "lucide-react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Tóm tắt nội dung bài đọc",
  "Ý nghĩa của bài đọc là gì?",
] as const;

interface ChatMessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
  onPickSuggestion: (text: string) => void;
}

export function ChatMessageList({
  messages,
  isStreaming,
  onPickSuggestion,
}: ChatMessageListProps) {
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-col items-center px-4 pt-[34px] pb-5">
        <MessageCircle className="w-[30px] h-[30px] text-primary stroke-2" />
        <p className="mt-3.5 text-[15px] font-bold text-foreground text-center">
          Hỏi về bài đọc
        </p>
        <p className="mt-1 text-xs text-ink-3 text-center">
          Hỏi bất cứ điều gì về bài đọc này
        </p>
        <div className="w-full mt-5 flex flex-col gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onPickSuggestion(suggestion)}
              className="text-left bg-surface border border-border rounded-[13px] px-3.5 py-3 text-[12.5px] leading-normal text-foreground transition-colors hover:border-primary hover:text-indigo-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 flex flex-col gap-2.5">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={cn(
            "text-[13px] leading-relaxed",
            // Câu hỏi của người dùng là bong bóng; câu trả lời để trần cho dễ đọc.
            msg.role === "user"
              ? "ml-auto max-w-[88%] px-3.5 py-2.5 rounded-[14px] rounded-br-[5px] bg-primary text-primary-foreground shadow-indigo"
              : "w-full py-1 text-foreground",
          )}
        >
          {msg.parts.map((part, i) =>
            part.type === "text" ? (
              <p key={i} className="whitespace-pre-wrap">
                {part.text}
              </p>
            ) : null,
          )}
        </div>
      ))}
      {isStreaming && (
        <div className="flex items-center gap-2 py-1 text-[13px] text-ink-3">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span>Đang trả lời…</span>
        </div>
      )}
    </div>
  );
}
