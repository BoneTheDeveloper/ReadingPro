"use client";

import { useState } from "react";
import { FileText, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/shared/classname";
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
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-neutral-200 bg-neutral-50">
          <FileText className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-neutral-900">Paste Your Text</h3>
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
            "font-serif text-lg leading-relaxed text-neutral-700",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          )}
        />

        <div className="flex items-center justify-between p-4 border-t border-neutral-200 bg-neutral-50">
          <span className="text-sm text-neutral-500">
            {wordCount} {wordCount === 1 ? "word" : "words"}
          </span>

          <button
            onClick={handleSubmit}
            disabled={disabled || isProcessing || text.trim().length === 0}
            className={cn(
              "px-6 py-2.5 rounded-lg font-medium transition-all",
              "bg-primary-600 text-white hover:bg-primary-700",
              "disabled:bg-neutral-300 disabled:cursor-not-allowed",
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
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
