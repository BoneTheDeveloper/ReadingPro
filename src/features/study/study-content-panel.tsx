"use client";

import { useState } from "react";
import {
  Loader2,
  FileText,
  Clock,
  Languages,
  Bookmark,
  Share2,
  FileSearch,
} from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { calculateReadingTime } from "@/lib/shared/reading-utils";
import { getCEFRLabel } from "@/lib/domain/cefr";
import { getCEFRColor } from "@/lib/ui/cefr-style";
import type { PassageData } from "./study-types";

interface StudyContentPanelProps {
  passage: PassageData | null;
  error: string | null;
  simplifying: boolean;
  onSimplify: () => void;
}

type ViewMode = "original" | "simplified";

const SKIP_SIMPLIFY_LEVELS = new Set(["A1", "A2"]);

export function StudyContentPanel({
  passage,
  error,
  simplifying,
  onSimplify,
}: StudyContentPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("simplified");

  // Empty state
  if (!passage) {
    return (
      <div className="flex items-center justify-center h-full min-h-100">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileSearch className="w-6 h-6 text-on-surface-variant" />
          </div>
          <p className="text-[16px] font-medium text-on-surface">
            Select a document from Sources
          </p>
          <p className="text-[14px] text-on-surface-variant mt-1">
            Choose from your recent documents or add a new one
          </p>
        </div>
      </div>
    );
  }

  // Simplifying loading state
  if (simplifying) {
    return (
      <div className="flex items-center justify-center h-full min-h-100">
        <div className="text-center">
          <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-[16px] font-medium text-on-surface">
            Simplifying content...
          </p>
          <p className="text-[14px] text-on-surface-variant mt-1">
            This may take a moment
          </p>
        </div>
      </div>
    );
  }

  // Reading state
  const currentContent =
    viewMode === "simplified" && passage.simplifiedContent
      ? passage.simplifiedContent
      : passage.content;
  const currentLevel =
    viewMode === "simplified" ? passage.simplifiedLevel : passage.originalLevel;
  const level = (currentLevel || passage.originalLevel || "B2") as Parameters<
    typeof getCEFRColor
  >[0];
  const readingTime = calculateReadingTime(passage.wordCount, level);
  const canSimplify =
    !passage.simplifiedContent &&
    passage.originalLevel &&
    !SKIP_SIMPLIFY_LEVELS.has(passage.originalLevel);

  return (
    <div className="p-8 overflow-y-auto panel-scroll flex-1">
      <div className="max-w-3xl mx-auto">
        {/* Controls & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            {passage.simplifiedContent ? (
              <div className="flex bg-surface-container-high p-1 rounded-lg">
                <button
                  onClick={() => setViewMode("simplified")}
                  className={cn(
                    "px-4 py-1.5 text-[12px] font-medium rounded-md transition-all",
                    viewMode === "simplified"
                      ? "bg-surface-container-lowest shadow-sm text-primary"
                      : "text-on-surface-variant",
                  )}
                >
                  Simplified ({passage.simplifiedLevel})
                </button>
                <button
                  onClick={() => setViewMode("original")}
                  className={cn(
                    "px-4 py-1.5 text-[12px] font-medium rounded-md transition-all",
                    viewMode === "original"
                      ? "bg-surface-container-lowest shadow-sm text-primary"
                      : "text-on-surface-variant",
                  )}
                >
                  Original ({passage.originalLevel})
                </button>
              </div>
            ) : canSimplify ? (
              <button
                onClick={onSimplify}
                disabled={simplifying}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-on-primary text-[12px] font-semibold hover:opacity-90 transition-all shadow-sm disabled:opacity-50"
              >
                <Languages className="w-3.5 h-3.5" />
                Simplify
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[12px] font-medium border border-primary/20">
              {getCEFRLabel(level)}
            </span>
            <div className="flex items-center gap-1 text-on-surface-variant text-[12px]">
              <Clock className="w-3.5 h-3.5" />
              {readingTime}
            </div>
            <div className="flex items-center gap-1 text-on-surface-variant text-[12px]">
              <FileText className="w-3.5 h-3.5" />
              {passage.wordCount} words
            </div>
          </div>
        </div>

        {/* Text content */}
        <div className="max-w-none">
          <h3 className="text-[24px] font-bold text-on-surface mb-4">
            {passage.title}
          </h3>
          <div className="text-[18px] leading-[1.6] text-on-surface">
            {currentContent.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-6 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="mt-8 pt-6 border-t border-outline-variant flex justify-between items-center">
          <button className="flex items-center gap-2 text-primary text-[14px] font-semibold hover:underline">
            <Languages className="w-4 h-4" />
            Translate passage
          </button>
          <div className="flex gap-4">
            <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <Bookmark className="w-5 h-5 text-on-surface-variant" />
            </button>
            <button className="p-2 hover:bg-surface-container-high rounded-full transition-colors">
              <Share2 className="w-5 h-5 text-on-surface-variant" />
            </button>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 p-3 bg-error-container border border-destructive/20 rounded-lg text-destructive text-[14px]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
