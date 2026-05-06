"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  FileText,
  Languages,
  BookOpen,
  ArrowLeft,
  Layers,
  GitBranch,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import type { ResultItem, ResultItemType, StudioCardId } from "./study-types";
import { QuizContent } from "./study-quiz-content";

interface StudyStudioPanelProps {
  results: ResultItem[];
  hasActivePassage: boolean;
  simplifying: boolean;
  onActionClick: (cardId: StudioCardId) => void;
}

const studioCards: {
  id: StudioCardId;
  label: string;
  description: string;
  icon: typeof BookOpen;
  disabled?: boolean;
}[] = [
  { id: "quiz", label: "Quiz", description: "Test comprehension", icon: HelpCircle },
  { id: "flashcards", label: "Flashcards", description: "Key vocabulary", icon: Layers, disabled: true },
  { id: "summary", label: "Summary", description: "Simplified text", icon: FileText },
  { id: "mindmap", label: "Mind Map", description: "Visual overview", icon: GitBranch, disabled: true },
  { id: "translate", label: "Translate", description: "Vietnamese translation", icon: Languages, disabled: true },
];

const resultMeta: Record<ResultItemType, { icon: typeof HelpCircle; label: string }> = {
  quiz: { icon: HelpCircle, label: "Quiz" },
  summary: { icon: FileText, label: "Summary" },
};

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function StudyStudioPanel({
  results,
  hasActivePassage,
  simplifying,
  onActionClick,
}: StudyStudioPanelProps) {
  const [viewingResult, setViewingResult] = useState<ResultItem | null>(null);

  // Result detail view (panel replacement)
  if (viewingResult) {
    const meta = resultMeta[viewingResult.type] ?? { icon: HelpCircle, label: viewingResult.type };
    const Icon = meta.icon;

    return (
      <div className="flex flex-col h-full overflow-hidden border border-[#e5e7eb]" style={{ background: "#ffffff", borderRadius: "12px" }}>
        <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid #e5e7eb" }}>
          <button
            onClick={() => setViewingResult(null)}
            className="p-1.5 rounded-lg hover:bg-surface-container-highest transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-on-surface-variant" />
          </button>
          <Icon className="w-4 h-4 text-on-surface-variant" />
          <h2 className="text-[14px] font-semibold text-on-surface truncate">
            {meta.label}: {viewingResult.passageTitle}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll p-4">
          {viewingResult.type === "quiz" && viewingResult.data?.questions && (
            <QuizContent
              questions={viewingResult.data.questions}
              passageTitle={viewingResult.passageTitle}
              onReset={() => setViewingResult(null)}
            />
          )}
          {viewingResult.type === "summary" && viewingResult.data?.simplifiedContent && (
            <div>
              {viewingResult.data.simplifiedLevel && (
                <span className="text-[12px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {viewingResult.data.simplifiedLevel}
                </span>
              )}
              <p className="text-[14px] text-on-surface leading-relaxed whitespace-pre-wrap mt-3">
                {viewingResult.data.simplifiedContent}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const runningCount = results.filter((r) => r.status === "running").length;
  const maxConcurrent = 3;
  const isCardLocked = (cardId: StudioCardId) => {
    if (cardId === 'summary') return simplifying || results.some((r) => r.status === 'running' && r.type === 'summary');
    if (cardId === 'quiz') return results.some((r) => r.status === 'running' && r.type === 'quiz');
    return false;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden border border-[#e5e7eb]" style={{ background: "#ffffff", borderRadius: "12px" }}>
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-[0.05em]">
          Studio
        </h2>
      </div>

      {/* Action cards grid (unchanged) */}
      <div className="px-3 pb-3 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
        {studioCards.map((card) => {
          const locked = !card.disabled && hasActivePassage && isCardLocked(card.id);
          const disabled = card.disabled || !hasActivePassage || runningCount >= maxConcurrent || locked;
          return (
            <button
              key={card.id}
              onClick={() => !disabled && onActionClick(card.id)}
              disabled={disabled}
              className={cn(
                "flex flex-col items-start gap-2 p-3 rounded-lg transition-all relative overflow-hidden",
                card.disabled
                  ? "opacity-40 cursor-not-allowed bg-neutral-100 border border-neutral-200"
                  : locked
                    ? "border cursor-wait"
                    : "bg-primary/8 border border-primary/15 hover:bg-primary/15 hover:border-primary/30 hover:shadow-sm cursor-pointer",
                !card.disabled && !hasActivePassage && "opacity-50 cursor-not-allowed",
                !card.disabled && hasActivePassage && runningCount >= maxConcurrent && !locked && "opacity-50 cursor-not-allowed",
              )}
              style={locked ? { borderColor: "#B5D4F4" } : undefined}
            >
              {locked && (
                <div
                  className="absolute inset-0 z-0"
                  style={{
                    backgroundColor: "#E6F1FB",
                    animation: "upload-fill 2.8s ease-in-out forwards",
                  }}
                >
                  <div
                    className="absolute inset-y-0 w-16"
                    style={{
                      right: 0,
                      background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                      animation: "upload-shimmer 1.4s ease-in-out infinite",
                    }}
                  />
                </div>
              )}
              <div className={cn(
                "w-8 h-8 rounded-md flex items-center justify-center relative z-10",
                card.disabled ? "bg-neutral-200 text-on-surface-variant/50" : "bg-primary/12 text-primary",
                locked && "bg-[#E6F1FB] text-[#378ADD]",
              )}>
                <card.icon className="w-4 h-4" />
              </div>
              <p className={cn(
                "text-[12px] font-semibold leading-tight relative z-10",
                card.disabled ? "text-on-surface-variant/50" : locked ? "text-[#0a1a2e]" : "text-on-surface",
              )}>
                {card.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Results section */}
      <div className="flex-1 overflow-y-auto panel-scroll px-4 pb-4">
        {results.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] px-1 mb-2">
              Results
            </h3>
            {results.map((result) => {
              const meta = resultMeta[result.type] ?? { icon: HelpCircle, label: result.type };
              const Icon = meta.icon;
              return (
                <button
                  key={result.id}
                  onClick={() => result.status === "completed" && setViewingResult(result)}
                  disabled={result.status !== "completed"}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left",
                    result.status === "running" && "bg-primary/5 border border-primary/15",
                    result.status === "completed" && "hover:bg-surface-container-highest cursor-pointer",
                    result.status === "error" && "bg-destructive/5 border border-destructive/15 opacity-60",
                  )}
                >
                  {result.status === "running" ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                  ) : (
                    <Icon className="w-4 h-4 text-on-surface-variant shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-on-surface truncate">
                      {meta.label}: {result.passageTitle}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      {result.status === "running"
                        ? "Generating..."
                        : result.status === "error"
                          ? "Failed"
                          : formatRelativeTime(result.completedAt ?? result.startedAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {results.length === 0 && hasActivePassage && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="w-8 h-8 text-on-surface-variant/30 mb-3" />
            <p className="text-[13px] text-on-surface-variant/60">No results yet</p>
            <p className="text-[11px] text-on-surface-variant/40 mt-1">Click a card above to generate</p>
          </div>
        )}

        {!hasActivePassage && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen className="w-8 h-8 text-on-surface-variant/30 mb-3" />
            <p className="text-[13px] text-on-surface-variant/60">Select a passage</p>
            <p className="text-[11px] text-on-surface-variant/40 mt-1">Upload or select from sources</p>
          </div>
        )}
      </div>
    </div>
  );
}
