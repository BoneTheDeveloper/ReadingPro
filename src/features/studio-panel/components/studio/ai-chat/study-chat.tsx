"use client";

import { useRef, useEffect, useMemo, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getChatHistoryAction } from "@/features/studio-panel/server/actions/chat";
import * as Sentry from "@sentry/nextjs";

interface StudyChatPanelProps {
  passageId: string;
  prefilledQuestion?: string | null;
}

export function StudyChatPanel({ passageId, prefilledQuestion }: StudyChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState(prefilledQuestion ?? "");

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/studio/chat", body: { passageId } }),
    [passageId],
  );

  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ transport });
  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isStreaming]);

  useEffect(() => {
    let isMounted = true;
    async function bootstrapMessages() {
      try {
        const msgs = await getChatHistoryAction(passageId);
        if (isMounted) setMessages(msgs);
      } catch (error) {
        Sentry.captureException(error, { tags: { scope: "study.chat.history-fetch" }, extra: { passageId } });
        if (isMounted) setMessages([]);
      }
    }
    void bootstrapMessages();
    return () => { isMounted = false; };
  }, [passageId, setMessages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ text });
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto panel-scroll p-4 space-y-3">
        {messages.length === 0 && !isStreaming && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Bắt đầu trò chuyện về bài đọc này
          </p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={cn("rounded-lg px-3 py-2 text-sm leading-relaxed max-w-[90%]",
            msg.role === "user" ? "bg-primary/10 text-foreground ml-auto" : "bg-muted text-foreground mr-auto"
          )}>
            {(msg.parts ?? []).filter((part) => part.type === "text").map((part, i) => (
              <p key={i} className="whitespace-pre-wrap">{part.text}</p>
            ))}
          </div>
        ))}
        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Đang suy nghĩ...</span>
          </div>
        )}
      </div>

      {status === "error" && error && (
        <div className="px-4 py-2 border-t border-border bg-destructive/5 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive flex-1">Đã có lỗi xảy ra. Vui lòng thử lại.</p>
          <Button variant="ghost" size="sm" onClick={() => sendMessage()} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
            <RotateCw className="w-3 h-3" />
            Thử lại
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi về bài đọc này..."
          disabled={isStreaming}
          aria-label="Hỏi về bài đọc này..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
        />
        {isStreaming ? (
          <Button type="button" variant="outline" size="sm" onClick={stop} className="h-8 shrink-0">Dừng</Button>
        ) : (
          <Button type="submit" size="icon" disabled={isStreaming || !input.trim()} className="h-8 w-8 shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
