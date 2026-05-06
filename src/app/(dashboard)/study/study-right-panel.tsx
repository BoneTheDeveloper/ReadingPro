"use client";

import { useState } from "react";
import {
  Sparkles,
  Loader2,
  FileText,
  Languages,
  BookOpen,
  Brain,
  ArrowLeft,
  Layers,
  GitBranch,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import type { QuestionData, StudioCardId } from "./study-types";
import { QuizContent } from "./study-quiz-content";

interface StudyStudioPanelProps {
  questions: QuestionData[];
  passageTitle: string;
  hasActivePassage: boolean;
  generatingQuestions: boolean;
  onGenerateQuestions: () => void;
  onReset: () => void;
  onSimplify: () => void;
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

export function StudyStudioPanel({
  questions,
  passageTitle,
  hasActivePassage,
  generatingQuestions,
  onGenerateQuestions,
  onReset,
  onSimplify,
}: StudyStudioPanelProps) {
  const [activeCard, setActiveCard] = useState<StudioCardId | null>(null);

  // Quiz card: show quiz content inline
  if (activeCard === "quiz") {
    return (
      <div className="flex flex-col h-full overflow-hidden border border-[#e5e7eb]" style={{ background: '#ffffff', borderRadius: '12px' }}>
        <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveCard(null)}
            className="p-1.5 rounded-lg hover:bg-surface-container-highest transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-on-surface-variant" />
          </button>
          <h2 className="text-[14px] font-semibold text-on-surface">Quiz</h2>
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll p-4">
          <QuizContent questions={questions} passageTitle={passageTitle} onReset={onReset} />
        </div>
      </div>
    );
  }

  // Summary card: trigger simplify
  if (activeCard === "summary") {
    return (
      <div className="flex flex-col h-full overflow-hidden border border-[#e5e7eb]" style={{ background: '#ffffff', borderRadius: '12px' }}>
        <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveCard(null)}
            className="p-1.5 rounded-lg hover:bg-surface-container-highest transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-on-surface-variant" />
          </button>
          <h2 className="text-[14px] font-semibold text-on-surface">Summary</h2>
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll p-6 flex flex-col items-center justify-center">
          <div className="w-14 h-14 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-on-surface-variant" />
          </div>
          <p className="text-on-surface text-[16px] font-medium text-center mb-2">Simplified Summary</p>
          <p className="text-on-surface-variant/60 text-[14px] text-center mb-6">
            Generate an easier-to-read version of the passage
          </p>
          <button
            onClick={onSimplify}
            disabled={!hasActivePassage}
            className="px-6 py-3 rounded-xl bg-primary text-on-primary text-[14px] font-semibold hover:opacity-90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            Generate Summary
          </button>
        </div>
      </div>
    );
  }

  // Default: card grid
  return (
    <div className="flex flex-col h-full overflow-hidden border border-[#e5e7eb]" style={{ background: '#ffffff', borderRadius: '12px' }}>
      {/* Panel header */}
      <div className="p-4">
        <h2 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-[0.05em]">
          Studio
        </h2>
      </div>

      {/* Card grid */}
      <div className="p-4 overflow-y-auto panel-scroll flex-1">
        <div className="grid grid-cols-2 gap-3">
          {studioCards.map((card) => (
            <button
              key={card.id}
              onClick={() => !card.disabled && setActiveCard(card.id)}
              disabled={card.disabled}
              className={cn(
                "p-4 rounded-xl text-left transition-all flex flex-col items-center gap-3 text-center",
                card.disabled
                  ? "opacity-40 cursor-not-allowed bg-surface-container-lowest"
                  : "bg-surface-container-lowest hover:bg-surface-container-high hover:shadow-sm cursor-pointer",
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                card.disabled ? "bg-surface-container-high text-on-surface-variant/50" : "bg-primary/10 text-primary",
              )}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className={cn(
                  "text-[13px] font-semibold leading-tight",
                  card.disabled ? "text-on-surface-variant/50" : "text-on-surface",
                )}>
                  {card.label}
                </p>
                <p className="text-[11px] text-on-surface-variant mt-1 leading-tight">
                  {card.description}
                </p>
              </div>
              {card.disabled && (
                <span className="text-[10px] text-on-surface-variant/40 font-medium uppercase tracking-wider">
                  Coming soon
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Quick generate section */}
        {hasActivePassage && (
          <div className="mt-4 p-4 rounded-xl bg-surface-container-lowest">
            {generatingQuestions ? (
              <div className="flex items-center gap-3 py-2">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-[13px] text-on-surface-variant">Generating questions...</span>
              </div>
            ) : questions.length > 0 ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-on-surface">{questions.length} questions ready</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Open Quiz to start</p>
                </div>
                <button
                  onClick={() => setActiveCard("quiz")}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-semibold hover:opacity-90 transition-all shadow-sm"
                >
                  Open
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-on-surface">Generate questions</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">From the active passage</p>
                </div>
                <button
                  onClick={onGenerateQuestions}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[12px] font-semibold hover:opacity-90 transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Generate
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
