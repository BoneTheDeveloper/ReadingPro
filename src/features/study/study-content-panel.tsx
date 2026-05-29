"use client"

import { useRef } from "react";
import { useTranslations } from "next-intl";
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
import type { PassageData, TranslationSelection } from "./study-types";
import { extractSelectionInfo } from "./study-selection-utils";

type ViewMode = "original" | "simplified";

interface StudyContentPanelProps {
  passage: PassageData | null;
  error: string | null;
  simplifying: boolean;
  onSimplify: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectionChange: (selection: TranslationSelection | null) => void;
}

const SKIP_SIMPLIFY_LEVELS = new Set(["A1", "A2"]);

export function StudyContentPanel({
  passage,
  error,
  simplifying,
  onSimplify,
  viewMode,
  onViewModeChange,
  onSelectionChange,
}: StudyContentPanelProps) {
  const t = useTranslations("Study");
  const contentRef = useRef<HTMLDivElement>(null);

  if (!passage) {
    return (
      <div className="flex items-center justify-center h-full min-h-100">
        <div className="text-center">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
            <FileSearch className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-base font-medium text-foreground">
            {t("selectDocumentFromSources")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("chooseRecentOrAdd")}
          </p>
        </div>
      </div>
    );
  }

  if (simplifying) {
    return (
      <div className="flex items-center justify-center h-full min-h-100">
        <div className="text-center">
          <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <p className="text-base font-medium text-foreground">
            {t("simplifyingContent")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t("thisMayTakeMoment")}
          </p>
        </div>
      </div>
    );
  }

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

  function handleSelectionEvent() {
    if (!passage) return;
    const info = extractSelectionInfo({
      contentRef,
      sourceId: passage.id,
    });
    onSelectionChange(info);
  }

  return (
    <div className="p-8 overflow-y-auto panel-scroll flex-1">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2">
            {passage.simplifiedContent ? (
              <div className="flex bg-muted p-1 rounded-lg">
                <button
                  onClick={() => onViewModeChange("simplified")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                    viewMode === "simplified"
                      ? "bg-surface shadow-sm text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {t("simplified")} ({passage.simplifiedLevel})
                </button>
                <button
                  onClick={() => onViewModeChange("original")}
                  className={cn(
                    "px-4 py-1.5 text-xs font-medium rounded-md transition-all",
                    viewMode === "original"
                      ? "bg-surface shadow-sm text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {t("original")} ({passage.originalLevel})
                </button>
              </div>
            ) : canSimplify ? (
              <button
                onClick={onSimplify}
                disabled={simplifying}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
              >
                <Languages className="w-3.5 h-3.5" />
                {t("simplify")}
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium border border-primary/20">
              {getCEFRLabel(level)}
            </span>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Clock className="w-3.5 h-3.5" />
              {readingTime}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <FileText className="w-3.5 h-3.5" />
              {t("wordCount", { count: passage.wordCount })}
            </div>
          </div>
        </div>

        <div className="max-w-none">
          <h3 className="text-2xl font-bold text-foreground mb-4">
            {passage.title}
          </h3>
          <div
            ref={contentRef}
            className="reading-content text-foreground"
            onMouseUp={handleSelectionEvent}
            onDoubleClick={handleSelectionEvent}
          >
            {currentContent.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-6 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
          <button className="flex items-center gap-2 text-primary text-sm font-semibold hover:underline">
            <Languages className="w-4 h-4" />
            {t("translatePassage")}
          </button>
          <div className="flex gap-4">
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <Bookmark className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2 hover:bg-muted rounded-full transition-colors">
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-danger-soft border border-destructive/20 rounded-lg text-destructive text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
