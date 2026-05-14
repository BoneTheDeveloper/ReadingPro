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
  PanelRight,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ResultItem, ResultItemType, StudioCardId } from "./study-types";
import { QuizContent } from "./study-quiz-content";

interface StudyStudioPanelProps {
  results: ResultItem[];
  hasActivePassage: boolean;
  simplifying: boolean;
  onActionClick: (cardId: StudioCardId) => void;
  collapsed?: boolean;
  onToggleCollapse: () => void;
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
  collapsed = false,
  onToggleCollapse,
}: StudyStudioPanelProps) {
  const [viewingResult, setViewingResult] = useState<ResultItem | null>(null);

  if (viewingResult) {
    const meta = resultMeta[viewingResult.type] ?? { icon: HelpCircle, label: viewingResult.type };
    const Icon = meta.icon;

    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="p-4 flex items-center gap-3 border-b border-border">
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setViewingResult(null)}>
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </Button>
            <Icon className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground truncate">
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
                  <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                    {viewingResult.data.simplifiedLevel}
                  </span>
                )}
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mt-3">
                  {viewingResult.data.simplifiedContent}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Collapsed mode: icon-only strip
  if (collapsed) {
    return (
      <Card className="h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full items-center">
          <div className="w-full p-2 flex justify-center border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapse}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <PanelRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Icon-only action cards */}
          <div className="w-full px-2 py-2 flex flex-col items-center gap-1">
            {studioCards.map((card) => (
              <button
                key={card.id}
                onClick={() => !card.disabled && hasActivePassage && onActionClick(card.id)}
                disabled={card.disabled || !hasActivePassage}
                title={card.label}
                className={cn(
                  "w-11 h-11 rounded-lg flex items-center justify-center transition-colors cursor-pointer",
                  card.disabled
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <card.icon className="w-5 h-5" />
              </button>
            ))}
          </div>

          {/* Running indicators */}
          {results.filter((r) => r.status === "running").length > 0 && (
            <div className="w-full px-2 py-1 flex flex-col items-center gap-1">
              {results.filter((r) => r.status === "running").map((r) => (
                <div key={r.id} className="w-11 h-11 rounded-lg flex items-center justify-center bg-primary/10">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
              ))}
            </div>
          )}

          {/* Completed results as icons */}
          <div className="flex-1 overflow-y-auto panel-scroll w-full px-2 py-1">
            <div className="flex flex-col items-center gap-1">
              {results.filter((r) => r.status === "completed").map((result) => {
                const meta = resultMeta[result.type] ?? { icon: HelpCircle, label: result.type };
                const Icon = meta.icon;
                return (
                  <button
                    key={result.id}
                    onClick={() => setViewingResult(result)}
                    title={`${meta.label}: ${result.passageTitle}`}
                    className="w-11 h-11 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  const runningCount = results.filter((r) => r.status === "running").length;
  const maxConcurrent = 3;
  const isCardLocked = (cardId: StudioCardId) => {
    if (cardId === "summary")
      return simplifying || results.some((r) => r.status === "running" && r.type === "summary");
    if (cardId === "quiz")
      return results.some((r) => r.status === "running" && r.type === "quiz");
    return false;
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Studio</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <PanelRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="px-3 pb-3 grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-2">
          {studioCards.map((card) => {
            const locked = !card.disabled && hasActivePassage && isCardLocked(card.id);
            const disabled = card.disabled || !hasActivePassage || runningCount >= maxConcurrent || locked;

            return (
              <Button
                key={card.id}
                variant="outline"
                onClick={() => !disabled && onActionClick(card.id)}
                disabled={disabled}
                className={cn(
                  "h-auto flex flex-col items-start gap-2 p-3 relative overflow-hidden",
                  card.disabled && "opacity-40 cursor-not-allowed bg-muted",
                  !card.disabled && !hasActivePassage && "opacity-50 cursor-not-allowed",
                  !card.disabled && hasActivePassage && runningCount >= maxConcurrent && !locked && "opacity-50 cursor-not-allowed",
                  !disabled && "bg-primary/10 border-primary/15 hover:bg-primary/15 hover:border-primary/30 hover:shadow-sm cursor-pointer",
                )}
              >
                {locked && (
                  <div className="absolute inset-0 z-0 bg-accent animate-[upload-fill_2.8s_ease-in-out_forwards]">
                    <div className="absolute inset-y-0 w-16 right-0 bg-linear-to-r from-transparent via-white/55 to-transparent animate-[upload-shimmer_1.4s_ease-in-out_infinite]" />
                  </div>
                )}
                <div className={cn(
                  "w-8 h-8 rounded-md flex items-center justify-center relative z-10",
                  card.disabled ? "bg-muted text-muted-foreground/50" : locked ? "bg-accent text-primary" : "bg-primary/10 text-primary",
                )}>
                  <card.icon className="w-4 h-4" />
                </div>
                <p className={cn(
                  "text-xs font-semibold leading-tight relative z-10",
                  card.disabled ? "text-muted-foreground/50" : "text-foreground",
                )}>
                  {card.label}
                </p>
              </Button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto panel-scroll px-4 pb-4">
          {results.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                Results
              </h3>
              {results.map((result) => {
                const meta = resultMeta[result.type] ?? { icon: HelpCircle, label: result.type };
                const Icon = meta.icon;
                return (
                  <Button
                    key={result.id}
                    variant="ghost"
                    onClick={() => result.status === "completed" && setViewingResult(result)}
                    disabled={result.status !== "completed"}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 h-auto text-left",
                      result.status === "running" && "bg-primary/5 border border-primary/15",
                      result.status === "completed" && "hover:bg-muted cursor-pointer",
                      result.status === "error" && "bg-destructive/5 border border-destructive/15 opacity-60",
                    )}
                  >
                    {result.status === "running" ? (
                      <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                    ) : (
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">
                        {meta.label}: {result.passageTitle}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {result.status === "running"
                          ? "Generating..."
                          : result.status === "error"
                            ? "Failed"
                            : formatRelativeTime(result.completedAt ?? result.startedAt)}
                      </p>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}

          {results.length === 0 && hasActivePassage && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-[13px] text-muted-foreground/60">No results yet</p>
              <p className="text-[11px] text-muted-foreground/40 mt-1">Click a card above to generate</p>
            </div>
          )}

          {!hasActivePassage && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BookOpen className="w-8 h-8 text-muted-foreground/30 mb-3" />
              <p className="text-[13px] text-muted-foreground/60">Select a passage</p>
              <p className="text-[11px] text-muted-foreground/40 mt-1">Upload or select from sources</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
