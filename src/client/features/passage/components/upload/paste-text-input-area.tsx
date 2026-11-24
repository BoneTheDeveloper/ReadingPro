"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { useIsPro } from "@/client/features/subscription";
import { sourceSizeError } from "../../lib/passage-limits";
import { Button } from "@/client/components/ui/button";
import { Textarea } from "@/client/components/ui/textarea";

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
  const isPro = useIsPro();
  const error = submitted ? sourceSizeError(text, isPro) : null;
  const handleSubmit = () => {
     setSubmitted(true);
     if (sourceSizeError(text, isPro)) return;
     onSubmit(text);};
  const length = text.trim().length;

  return (
    <div className="w-full space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
        autoFocus
        aria-label="Văn bản cần thêm"
        aria-invalid={Boolean(error)}
        placeholder="Dán hoặc nhập văn bản tiếng Anh hay tiếng Việt…"
        className="min-h-64 max-h-[50vh] w-full resize-y rounded-[12px] border-border bg-surface px-4 py-3.5 text-[15px] leading-relaxed"
      />

      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-[13px] text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={disabled || length === 0}>
          {disabled ? "Đang thêm…" : "Thêm bài đọc"}
        </Button>
      </div>
    </div>
  );
}
