"use client";

import { cn } from "@/lib/shared/utils";

interface TestPassagePanelProps {
  title: string;
  content: string;
  showPassage: boolean;
  showFeedback: boolean;
  highlightedLine: number;
  onTogglePassage: () => void;
}

export function TestPassagePanel({
  title,
  content,
  showPassage,
  showFeedback,
  highlightedLine,
  onTogglePassage,
}: TestPassagePanelProps) {
  const passageLines = content.split("\n").filter((l) => l.trim().length > 0);

  return (
    <div className="mb-6 lg:mb-0">
      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <h2 className="font-semibold text-neutral-900 text-sm">{title}</h2>
          <button
            onClick={onTogglePassage}
            className="text-xs text-primary-600 hover:underline lg:hidden"
          >
            {showPassage ? "Hide" : "Show"} Passage
          </button>
        </div>
        <div
          className={cn(
            "p-6 max-h-[400px] overflow-y-auto",
            "lg:block",
            showPassage ? "block" : "hidden",
          )}
        >
          {passageLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "relative pl-8 mb-3 text-neutral-700 font-serif",
                showFeedback &&
                  i + 1 === highlightedLine &&
                  "bg-primary-50 rounded px-2 -mx-2 pl-10",
              )}
            >
              <span className="absolute left-0 top-0 text-xs text-neutral-400 font-sans w-5 text-right">
                {i + 1}
              </span>
              <span
                className={cn(
                  showFeedback &&
                    i + 1 === highlightedLine &&
                    "bg-gradient-to-t from-primary-100 to-transparent",
                )}
              >
                {line}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
