"use client";

import { useChat } from "@ai-sdk/react";
import { Loader2, Send, Sparkles, StopCircle } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/shared/utils";

interface StudyChatPanelProps {
  passageId: string;
  passageContent: string;
  passageTitle: string;
}

const promptSuggestions = [
  "Summarize the main idea",
  "Explain difficult vocabulary",
  "Quiz me on this passage",
];

function getMessageText(message: {
  parts?: Array<{ type: string; text?: string }>;
}) {
  return (
    message.parts
      ?.filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("") ?? ""
  );
}

export function StudyChatPanel({
  passageId,
  passageContent,
  passageTitle,
}: StudyChatPanelProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const requestBody = useMemo(
    () => ({ passageId, passageContent }),
    [passageContent, passageId],
  );
  const { messages, sendMessage, status, error, stop } = useChat({
    api: "/api/study-chat",
    body: requestBody,
  });
  const isStreaming = status === "submitted" || status === "streaming";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const submitMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    setInput("");
    await sendMessage({ text: trimmed }, { body: requestBody });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitMessage(input);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Passage chat
        </p>
        <h3 className="mt-1 truncate text-sm font-semibold text-foreground">
          {passageTitle}
        </h3>
      </div>

      <ScrollArea className="panel-scroll flex-1 space-y-3 px-4 py-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center">
            <Sparkles className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-foreground">
              Ask about this passage
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Get explanations, summaries, vocabulary help, or comprehension
              practice.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {promptSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start whitespace-normal text-left text-xs"
                  disabled={isStreaming}
                  onClick={() => void submitMessage(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => {
          const text = getMessageText(message);
          if (!text) return null;
          const isUser = message.role === "user";

          return (
            <div
              key={message.id}
              className={cn("flex", isUser ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                  isUser
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border bg-muted text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{text}</p>
              </div>
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Thinking…
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {error.message || "Chat failed. Please try again."}
          </div>
        )}
        <div ref={bottomRef} />
      </ScrollArea>

      <form
        onSubmit={handleSubmit}
        className="border-t border-border bg-card p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Ask about the passage..."
            disabled={isStreaming}
            className="max-h-28 min-h-10 resize-none text-sm"
            rows={1}
          />
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label="Stop response"
              onClick={stop}
            >
              <StopCircle className="size-4" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              aria-label="Send message"
              disabled={!input.trim()}
            >
              <Send className="size-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
