"use client";

import { useEffect, useRef, useState } from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { AlertCircle, Loader2, RotateCw, Trash2 } from "lucide-react";
import { StudioDetailView } from "../studio-detail-view";
import { ChatMessageList } from "./chat-message-list";
import { ChatComposer } from "./chat-composer";
import { useQuery } from "@tanstack/react-query";
import { chatQueries } from "../../../api/queries";
import { useResetChatMutation } from "../../../api/mutations";
import { useChatContext } from "./chat-context";
import { getErrorMessage } from "@/client/lib/api/error-message";
import { Button } from "@/client/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/client/components/ui/dialog";

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
          {getErrorMessage(historyQuery.error)}
        </div>
      </StudioDetailView>
    );
  }

  return (
    <ChatConversation
      passageId={passageId}
      history={historyQuery.data}
      onClose={onClose}
    />
  );
}

function ChatConversation({
  passageId,
  history,
  onClose,
}: ChatDetailViewProps & { history: UIMessage[] }) {
  const [input, setInput] = useState("");
  const { getChat, language, setLanguage, clearChatMessages } = useChatContext();
  const resetChat = useResetChatMutation();

  // The history seeds the chat only on its first open; later opens reuse the
  // live instance from context, which already holds every turn.
  const [chat] = useState(() => getChat(history));
  const { messages, sendMessage, status, error, stop, regenerate } = useChat({ chat });

  const isStreaming = status === "submitted" || status === "streaming";
  const [confirmReset, setConfirmReset] = useState(false);

  // Follow new text only while the reader is at the bottom, so scrolling up
  // to reread an earlier answer is not yanked back down.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  const handleSubmit = () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    stickToBottom.current = true;
    // Pass dynamic values per request — hook-level body is captured at
    // mount and can go stale after subsequent sends.
    sendMessage({ text }, { body: { passageId, language } });
  };

  const handleReset = () => {
    if (isStreaming) return;

    // The mutation evicts the cached history; clearing chat's messages
    // makes the open conversation re-render empty.
    resetChat.mutate(passageId, {
      onSuccess: () => {
        clearChatMessages();
        setConfirmReset(false);
      },
    });
  };

  const resetButton = (
    <button
      type="button"
      onClick={() => setConfirmReset(true)}
      disabled={isStreaming || messages.length === 0}
      aria-label="Xoá hội thoại"
      title="Xoá hội thoại"
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-transparent text-ink-3 transition-colors hover:bg-surface hover:border-border hover:text-danger disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-transparent disabled:hover:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Trash2 className="w-[15px] h-[15px]" />
    </button>
  );

  return (
    <StudioDetailView title="Trò chuyện" onClose={onClose} action={resetButton}>
      <div className="flex flex-col h-full">
        <div
          ref={scrollRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
          }}
          className="flex-1 min-h-0 overflow-y-auto panel-scroll bg-paper"
        >
          <ChatMessageList
            messages={messages}
            status={status}
            onPickSuggestion={(text) => {
              stickToBottom.current = true;
              sendMessage({ text }, { body: { passageId, language } });
            }}
          />
        </div>

        {status === "error" && error && (
          <div className="shrink-0 px-4 py-2 border-t border-border bg-danger-soft flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-danger shrink-0" />
            <p className="text-[13.5px] text-danger flex-1">Đã có lỗi xảy ra. Vui lòng thử lại.</p>
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

      <Dialog open={confirmReset} onOpenChange={(open) => !open && !resetChat.isPending && setConfirmReset(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xoá hội thoại?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Toàn bộ tin nhắn với bài đọc này sẽ bị xoá và không khôi phục được.
          </p>
          {resetChat.isError && (
            <p className="text-sm text-destructive">{getErrorMessage(resetChat.error)}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(false)} disabled={resetChat.isPending}>
              Huỷ
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={resetChat.isPending}>
              {resetChat.isPending ? "Đang xoá..." : "Xoá"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </StudioDetailView>
  );
}
