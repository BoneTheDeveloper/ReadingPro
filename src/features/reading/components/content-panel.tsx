"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FileText, FileSearch, Plus, FileType, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCEFRShortLabel } from "@/utils/cefr";
import { getCEFRBadgeVariant } from "./cefr-badge";
import { Badge } from "@/components/ui/badge";
import { useScrollProgress } from "@/features/reading/hooks/use-scroll-progress";
import { useContentState } from "@/features/reading/hooks/use-content-state";
import type { PassageData } from "@/types/passage";
import { extractSelectionInfo } from "@/features/reading/lib/selection-utils";
import { getPassageSourceUrlAction } from "@/features/passage-crud/server/actions/passage";
import { PdfViewer } from "./pdf-viewer";
import { YouTubeEmbed } from "./youtube-embed";
import { TranslationPopup } from "./translation-popup";

export function ContentPanel({
  passage,
  error,
  onOpenUploadModal,
}: {
  passage: PassageData | null;
  error: string | null;
  onOpenUploadModal: () => void;
}) {
  const {
    viewMode,
    setViewMode,
    selectedWordInfo,
    translationState,
    isVocabularySaved,
    handleWordSelection,
    translateWord,
    handleSaveVocabulary,
  } = useContentState({ passageId: passage?.id });
  
  const t = useTranslations("Study");
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectionStartedInContentRef = useRef(false);
  const progress = useScrollProgress(scrollRef);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  // Fetch source URL when switching to source view
  useEffect(() => {
    if (viewMode !== "pdf" || !passage?.filePath) {
      return;
    }

    const passageId = passage.id;
    let cancelled = false;

    async function fetchSourceUrl() {
      setSourceLoading(true);
      const url = await getPassageSourceUrlAction(passageId);
      if (!cancelled) {
        setSourceUrl(url);
        setSourceLoading(false);
      }
    }

    fetchSourceUrl();

    return () => {
      cancelled = true;
    };
  }, [viewMode, passage?.filePath]);

  const updateSelectionFromMouseEvent = useCallback(
    (event: MouseEvent) => {
      if (!passage) return;
      const info = extractSelectionInfo({
        contentRef,
        sourceId: passage.id,
        cursorPoint: {
          x: event.clientX,
          y: event.clientY,
        },
      });
      handleWordSelection(info);
    },
    [passage, handleWordSelection],
  );

  useEffect(() => {
    function handleDocumentMouseUp(event: MouseEvent) {
      if (!selectionStartedInContentRef.current) return;
      selectionStartedInContentRef.current = false;
      updateSelectionFromMouseEvent(event);
    }

    document.addEventListener("mouseup", handleDocumentMouseUp);
    return () => document.removeEventListener("mouseup", handleDocumentMouseUp);
  }, [updateSelectionFromMouseEvent]);

  const handleContentMouseUp = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (selectionStartedInContentRef.current) return;
      updateSelectionFromMouseEvent(event.nativeEvent);
    },
    [updateSelectionFromMouseEvent],
  );

  const handleContentMouseDown = useCallback(() => {
    selectionStartedInContentRef.current = true;
  }, []);

  if (!passage) {
    return (
      <div className="flex items-center justify-center h-full min-h-100">
        <div className="text-center">
          <div className="w-12 h-12 bg-muted flex items-center justify-center mx-auto mb-4">
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t("addSource")}
          </button>
        </div>
      </div>
    );
  }

  const level = (passage.cefrLevel || "B2") as Parameters<
    typeof getCEFRBadgeVariant
  >[0];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 3px indigo→coral reading progress strip — wireframe §1 lines 117-120 */}
      <div
        className="h-[3px] w-full bg-border shrink-0"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-coral transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* 53px meta bar — wireframe §1 lines 121-137: CEFR/word-count LEFT, Original/Simplified RIGHT */}
      <div className="h-[53px] shrink-0 flex items-center gap-3 px-6 border-b border-border/20">
        <div className="flex items-center gap-3">
          <Badge variant={getCEFRBadgeVariant(level)}>
            {getCEFRShortLabel(level)}
          </Badge>
          <span className="w-px h-3.5 bg-border" />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            {t("wordCount", { count: passage.wordCount })}
          </span>
        </div>

        <div className="ml-auto">
          {passage.sourceType === "YOUTUBE" && (
            <SegmentedToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                {
                  value: "passage",
                  label: t("passage"),
                },
                {
                  value: "video",
                  label: t("video"),
                },
              ]}
            />
          )}
          {passage.sourceType === "PDF" && (
            <SegmentedToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                {
                  value: "passage",
                  label: t("passage"),
                },
                {
                  value: "pdf",
                  label: t("pdf"),
                },
              ]}
            />
          )}
        </div>
      </div>

      {/* Reading content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto panel-scroll px-8 pt-7 pb-20"
      >
        {viewMode === "video" && passage.youtubeUrl ? (
          <YouTubeEmbed url={passage.youtubeUrl} />
        ) : viewMode === "pdf" && passage.sourceType === "PDF" ? (
          <div className="h-full flex flex-col">
            {sourceLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : sourceUrl ? (
              <PdfViewer
                url={sourceUrl}
                className="min-h-[60vh]"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileType className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {passage.filePath
                      ? t("sourceNotAvailable")
                      : t("noSourceFile")}
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-[66ch] mx-auto">
            <h3 className="font-serif text-[27px] font-semibold text-foreground mb-5 leading-tight">
              {passage.title}
            </h3>
            <div
              ref={contentRef}
              className="reading-content text-foreground"
              onMouseDown={handleContentMouseDown}
              onMouseUp={handleContentMouseUp}
            >
              {passage.content.split("\n\n").map((paragraph, i) => (
                <p key={i} className="mb-6 last:mb-0">
                  {paragraph}
                </p>
              ))}
            </div>

            {error && (
              <div className="mt-8 pt-6 border-t border-border/20">
                <div className="p-3 bg-danger-soft border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Translation popup — rendered at content panel level */}
      {selectedWordInfo && passage && (
        <TranslationPopup
          selection={selectedWordInfo}
          translation={translationState.data}
          status={translationState.status}
          onTranslate={translateWord}
          onSave={handleSaveVocabulary}
          saved={isVocabularySaved}
          onDismiss={() => handleWordSelection(null)}
        />
      )}
    </div>
  );
}

/**
 * Pill segmented control — paper bg, indigo text on the active item.
 * Matches the wireframe's Original/Simplified toggle (lines 133-136).
 */
function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; disabled?: boolean }[];
}) {
  return (
    <div className="inline-flex bg-paper border border-border p-[3px]">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => !opt.disabled && onChange(opt.value)}
            disabled={opt.disabled}
            className={cn(
              "px-3.5 py-1.5 text-xs font-semibold transition-all",
              active
                ? "bg-surface text-primary shadow-sm"
                : opt.disabled
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}