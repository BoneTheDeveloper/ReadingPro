"use client";

import { useRef, type FormEvent, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import type { StudyChatLanguage } from "@/features/studio/schema/ai-chat";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  language: StudyChatLanguage;
  onLanguageChange: (language: StudyChatLanguage) => void;
}

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  language,
  onLanguageChange,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSend = value.trim().length > 0 && !isStreaming;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSubmit();
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  };

  // Enter sends, Shift+Enter inserts a newline.
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    if (!canSend) return;
    onSubmit();
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  };

  const handleChange = (next: string) => {
    onChange(next);
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="shrink-0 px-3.5 pt-3 pb-3.5 border-t border-border bg-panel"
    >
      <div className="flex flex-col gap-2 rounded-[14px] border border-border bg-surface pl-3 pr-2.5 py-2 shadow-card focus-within:border-primary transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Hỏi về bài đọc…"
          rows={3}
          aria-label="Hỏi về bài đọc"
          className="w-full resize-none border-none bg-transparent pt-1 text-[13px] leading-[1.55] text-foreground placeholder:text-ink-3 outline-none min-h-[58px] max-h-[132px] overflow-y-auto panel-scroll"
        />
        <div className="flex items-center justify-between gap-2">
          <div
            role="radiogroup"
            aria-label="Ngôn ngữ trả lời"
            title="Ngôn ngữ trả lời"
            className="flex items-center gap-[3px] rounded-full border border-border bg-muted p-0.5 text-[10px] font-bold"
          >
            <button
              type="button"
              role="radio"
              aria-checked={language === "vi"}
              onClick={() => onLanguageChange("vi")}
              className={`px-2 py-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                language === "vi"
                  ? "bg-surface text-foreground shadow-card"
                  : "text-ink-3 hover:text-foreground"
              }`}
            >
              VI
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={language === "en"}
              onClick={() => onLanguageChange("en")}
              className={`px-2 py-1 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                language === "en"
                  ? "bg-surface text-foreground shadow-card"
                  : "text-ink-3 hover:text-foreground"
              }`}
            >
              EN
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Dừng trả lời"
                className="flex items-center justify-center w-8 h-8 shrink-0 rounded-[10px] border border-border bg-surface text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Gửi"
                className="flex items-center justify-center w-8 h-8 shrink-0 rounded-[10px] bg-primary text-primary-foreground shadow-indigo transition-colors hover:bg-indigo-hover disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Send className="w-[15px] h-[15px] stroke-[2.2]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
