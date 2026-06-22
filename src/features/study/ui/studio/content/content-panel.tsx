"use client"

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Loader2,
  FileText,
  Clock,
  Languages,
  FileSearch,
  Plus,
} from "lucide-react";
import { cn } from "@/contracts/utils";
import { calculateReadingTime } from "@/contracts/reading-utils";
import { getCEFRLabel } from "@/contracts/domain/cefr";
import { getCEFRBadgeVariant } from "@/contracts/ui/cefr-style";
import { Badge } from "@/ui/primitives/badge";
import type { PassageData, TranslationSelection } from "@/features/study/model/types";
import { extractSelectionInfo } from "@/features/study/model/selection-utils";

type ViewMode = "original" | "simplified";

interface StudyContentPanelProps {
  passage: PassageData | null;
  error: string | null;
  simplifying: boolean;
  onSimplify: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onSelectionChange: (selection: TranslationSelection | null) => void;
  onOpenUploadModal: () => void;
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
  onOpenUploadModal,
}: StudyContentPanelProps) {
  const t = useTranslations("Study");
  const contentRef = useRef<HTMLDivElement>(null);
  const selectionStartedInContentRef = useRef(false);

  const updateSelectionFromMouseEvent = useCallback((event: MouseEvent) => {
    if (!passage) return;
    const info = extractSelectionInfo({
      contentRef,
      sourceId: passage.id,
      cursorPoint: {
        x: event.clientX,
        y: event.clientY,
      },
    });
    onSelectionChange(info);
  }, [passage, onSelectionChange]);

  useEffect(() => {
    function handleDocumentMouseUp(event: MouseEvent) {
      if (!selectionStartedInContentRef.current) return;
      selectionStartedInContentRef.current = false;
      updateSelectionFromMouseEvent(event);
    }

    document.addEventListener("mouseup", handleDocumentMouseUp);
    return () => document.removeEventListener("mouseup", handleDocumentMouseUp);
  }, [updateSelectionFromMouseEvent]);

  const handleContentMouseUp = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (selectionStartedInContentRef.current) return;
    updateSelectionFromMouseEvent(event.nativeEvent);
  }, [updateSelectionFromMouseEvent]);

  const handleContentMouseDown = useCallback(() => {
    selectionStartedInContentRef.current = true;
  }, []);

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
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            {t("chooseRecentOrAdd")}
          </p>
          <button
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("addSource")}
          </button>
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
    typeof getCEFRBadgeVariant
  >[0];
  const readingTime = calculateReadingTime(passage.wordCount, level);
  const canSimplify =
    !passage.simplifiedContent &&
    passage.originalLevel &&
    !SKIP_SIMPLIFY_LEVELS.has(passage.originalLevel);

  return (
    <div className="p-8 overflow-y-auto panel-scroll flex-1">
      <div className="max-w-3xl mx-auto">
        {/* Indigo→coral reading progress strip */}
        <div className="h-1 bg-gradient-to-r from-primary to-coral rounded-full mb-6 opacity-30" />
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
            <Badge variant={getCEFRBadgeVariant(level)}>
              {getCEFRLabel(level)}
            </Badge>
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
            onMouseDown={handleContentMouseDown}
            onMouseUp={handleContentMouseUp}
          >
            {currentContent.split("\n\n").map((paragraph, i) => (
              <p key={i} className="mb-6 last:mb-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-8 pt-6 border-t border-border">
            <div className="p-3 bg-danger-soft border border-destructive/20 rounded-lg text-destructive text-sm">
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
