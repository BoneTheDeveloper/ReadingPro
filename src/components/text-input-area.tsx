"use client";

import { useState } from "react";
import { FileText, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { validateTextContent } from "@/lib/validation/upload";

interface TextInputAreaProps {
  onSubmit: (text: string) => void;
  isProcessing?: boolean;
  disabled?: boolean;
}

export function TextInputArea({
  onSubmit,
  isProcessing,
  disabled,
}: TextInputAreaProps) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();

  const handleSubmit = () => {
    const validation = validateTextContent(text);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    setError(undefined);
    onSubmit(text);
  };

  const wordCount = text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return (
    <div className="w-full">
      <div className="bg-surface-container-lowest border border-border rounded-xl overflow-hidden shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-accent/40">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-[14px]">
            Paste Your Text
          </h3>
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(undefined);
          }}
          disabled={disabled || isProcessing}
          placeholder="Paste your English text content here..."
          className={cn(
            "w-full p-6 min-h-75 resize-none focus:outline-none",
            "text-[18px] leading-[1.6] text-foreground",
            "placeholder:text-muted-foreground/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        />

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-accent/40">
          <span className="text-[14px] text-muted-foreground">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>

          <button
            onClick={handleSubmit}
            disabled={disabled || isProcessing || text.trim().length === 0}
            className={cn(
              "px-6 py-2 rounded-lg text-[14px] font-semibold transition-all",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "shadow-[0px_2px_8px_rgba(59,92,228,0.2)]",
              "disabled:bg-border disabled:text-muted-foreground disabled:shadow-none disabled:cursor-not-allowed",
            )}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-error-container border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-[14px]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
