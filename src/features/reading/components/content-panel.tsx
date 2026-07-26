"use client";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(
  () => import("./pdf-viewer").then((mod) => mod.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
        Đang tải PDF...
      </div>
    )
  }
);import { useCallback, useEffect, useRef } from "react";
import { FileText, FileSearch, Plus, FileType } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCEFRShortLabel } from "@/utils/cefr";
import { getCEFRBadgeVariant } from "./cefr-badge";
import { Badge } from "@/components/ui/badge";
import { useScrollProgress } from "@/features/reading/hooks/use-scroll-progress";
import { useContentState } from "@/features/reading/hooks/use-content-state";
import type { PassageData } from "@/types/passage";
import { extractSelectionInfo } from "@/features/reading/lib/selection-utils";
import { YouTubeEmbed } from "./youtube-embed";
import { TranslationPopup } from "./translation-popup";

export function ContentPanel({
  passage,
  onOpenUploadModal,
}: {
  passage: PassageData | null;
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectionStartedInContentRef = useRef(false);
  const progress = useScrollProgress(scrollRef);
  const pdfBlobPathname =
    viewMode === "pdf" && passage?.filePath ? passage.filePath : null;

  const updateSelectionFromMouseEvent = useCallback(
    (event: MouseEvent) => {
      if (!passage) return;
      const info = extractSelectionInfo({
        contentRef,
        sourceId: passage.id,
        cursorPoint: { x: event.clientX, y: event.clientY },
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
            Chọn tài liệu từ Nguồn
          </p>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Chọn tài liệu gần đây hoặc thêm tài liệu mới
          </p>
          <button
            onClick={onOpenUploadModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Thêm nguồn
          </button>
        </div>
      </div>
    );
  }

  const level = (passage.cefrLevel || "B2") as Parameters<typeof getCEFRBadgeVariant>[0];

  return (
    <div className="flex flex-col h-full overflow-hidden">
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

      <div className="h-[53px] shrink-0 flex items-center gap-3 px-6 border-b border-border/20">
        <div className="flex items-center gap-3">
          <Badge variant={getCEFRBadgeVariant(level)}>
            {getCEFRShortLabel(level)}
          </Badge>
          <span className="w-px h-3.5 bg-border" />
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="w-3.5 h-3.5" />
            {passage.wordCount} từ
          </span>
        </div>

        <div className="ml-auto">
          {passage.sourceType === "YOUTUBE" && (
            <SegmentedToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "passage", label: "Bài đọc" },
                { value: "video", label: "Video" },
              ]}
            />
          )}
          {passage.sourceType === "PDF" && (
            <SegmentedToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: "passage", label: "Bài đọc" },
                { value: "pdf", label: "PDF" },
              ]}
            />
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto panel-scroll px-8 pt-7 pb-20"
      >
        {viewMode === "video" && (
          <YouTubeEmbed url={passage.youtubeUrl ?? ""} />
        )}
        {viewMode === "pdf" && !pdfBlobPathname && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <FileType className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                Không có tệp nguồn cho bài đọc này
              </p>
            </div>
          </div>
        )}
        {viewMode === "pdf" && pdfBlobPathname && (
          <PdfViewer blobPathname={pdfBlobPathname} fileName={passage.title} />
        )}
        {viewMode === "passage" && (
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
          </div>
        )}
      </div>

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
