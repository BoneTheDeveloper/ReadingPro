"use client";

import { useState } from "react";
import { FileText, AlertCircle } from "lucide-react";
import { TEXT_INPUT_LIMITS, TEXT_INPUT_ERRORS } from "@/features/passage/util/upload-config";
import { Button } from "@/component/ui/button";
import { Textarea } from "@/component/ui/textarea";

function getTextError(text: string): string | undefined {
  const len = text.trim().length;
  if (len < TEXT_INPUT_LIMITS.MIN_LENGTH) return TEXT_INPUT_ERRORS.TOO_SHORT;
  if (len > TEXT_INPUT_LIMITS.MAX_LENGTH) return TEXT_INPUT_ERRORS.TOO_LONG;
}
interface TextInputAreaProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

export function TextInputArea({
  onSubmit,
  disabled,
}: TextInputAreaProps) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const error = submitted ? getTextError(text) : undefined;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const handleSubmit = () => {
     setSubmitted(true);
     if (getTextError(text)) return;
     onSubmit(text);};
  return (
    <div className="w-full">
      <div className="border border-border rounded-[14px] overflow-hidden bg-surface">
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/40">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground text-sm">
            Nhập văn bản
          </h3>
        </div>

        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
          disabled={disabled}
          placeholder="Nhập tối thiểu 50 từ vào đây"
          className="w-full p-6 min-h-75 resize-none border-0 focus-visible:ring-0 text-lg leading-relaxed bg-surface font-serif"
        />

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-border bg-muted/40">
          <span className="text-sm text-muted-foreground">
            {wordCount} {wordCount === 1 ? "word" : "words"}
            <span className="mx-2">·</span>
            {text.length} / {TEXT_INPUT_LIMITS.MAX_LENGTH}
          </span>

          <Button
            onClick={handleSubmit}
            disabled={disabled || text.trim().length === 0}
          >
            Continue
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-danger-soft border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
